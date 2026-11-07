import { GoneException, Injectable, NotFoundException } from "@nestjs/common";

import { employeeActor } from "@modules/events";
import { type JsonObject, OperationsService } from "@modules/operations";

import { quarterReportDocument } from "../../domain/reports/quarter-report-document";
import type { Quarter } from "../../domain/reports/report-period";
import { FinanceReportRenderer } from "../../domain/repositories/finance-report-renderer.interface";
import {
    FinanceAttachmentStore,
    FinanceAuditLog,
    FinanceDirectory,
} from "../../domain/repositories/finance-sources.interface";
import { FINANCE_LIMITS } from "../../finance.limits";
import { financeAccessedEvent } from "../events/ledger-events";
import { EXPORT_QUARTER_REPORT } from "../operations/export-quarter-report.operation-definition";
import { FinanceCategoriesService } from "../services/finance-categories.service";
import { FinanceReportsService } from "../services/finance-reports.service";

export interface QuarterReportInput extends JsonObject {
    year: number;
    quarter: Quarter;
}

/**
 * Результат операции: имя файла и срок, до которого его можно скачать. `fileKey` — ключ в
 * private-хранилище; он не секрет (файл зашифрован ключом клуба, а маршрут скачивания отдаёт его
 * только автору операции), но нужен, чтобы найти файл.
 */
export interface QuarterReportFile extends JsonObject {
    fileName: string;
    expiresAt: string;
    fileKey: string;
}

export const REPORT_FILE_ERRORS = {
    notFound: "report_file_not_found",
    expired: "report_file_expired",
} as const;

const PDF_MIME = "application/pdf";
const HOUR_MS = 3_600_000;

const isReportFile = (value: JsonObject | null): value is QuarterReportFile =>
    typeof value?.fileName === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.fileKey === "string";

/**
 * Квартальный отчёт для gestor в PDF (`finance.admin`, фоновая операция):
 * - результат и статьи, цифры форм 303/130, IVA по ставкам, удержания, касса и банк — из одного
 *   чтения реестра; реквизиты организации — шапкой, время — в часовом поясе клуба;
 * - файл шифруется ключом клуба и лежит в private-хранилище рядом с вложениями проводок, привязан к
 *   id операции; скачать его может только автор и только до `expiresAt`;
 * - каждый отчёт — событие `finance.accessed` в журнале клуба, как любая выгрузка.
 */
@Injectable()
export class ExportQuarterReportUseCase {
    constructor(
        private readonly reports: FinanceReportsService,
        private readonly categories: FinanceCategoriesService,
        private readonly directory: FinanceDirectory,
        private readonly renderer: FinanceReportRenderer,
        private readonly files: FinanceAttachmentStore,
        private readonly audit: FinanceAuditLog,
        private readonly operations: OperationsService
    ) {}

    async execute(
        context: { portalId: string; employeeId: string; operationId: string },
        input: QuarterReportInput
    ): Promise<QuarterReportFile> {
        const { portalId, employeeId, operationId } = context;
        const [quarter, categories, timeZone] = await Promise.all([
            this.reports.quarter(portalId, input.year, input.quarter),
            this.categories.list(portalId, true),
            this.directory.timeZone(portalId),
        ]);
        const generatedAt = new Date();
        const pdf = await this.renderer.renderPdf(
            quarterReportDocument({
                identity: quarter.profile.identity,
                period: quarter.period,
                summary: quarter.summary,
                categories,
                vat: quarter.report.vat,
                withholding: quarter.report.withholding,
                accounts: quarter.report.accounts,
                forms: quarter.forms,
                generatedAt,
                timeZone,
            })
        );
        const fileKey = await this.files.put(portalId, operationId, pdf);
        await this.audit.record([
            financeAccessedEvent(portalId, "report", quarter.period, employeeActor(employeeId)),
        ]);
        return {
            fileName: `informe-${input.year}-${input.quarter}T.pdf`,
            expiresAt: new Date(
                generatedAt.getTime() + FINANCE_LIMITS.reportFileHours * HOUR_MS
            ).toISOString(),
            fileKey,
        };
    }

    /** Файл готового отчёта автору: чужая или незавершённая операция — 404, просроченная — 410. */
    async download(
        portalId: string,
        employeeId: string,
        operationId: string
    ): Promise<{ body: Buffer; contentType: string; fileName: string }> {
        const operation = await this.operations.getForRequester(operationId, portalId, employeeId);
        if (
            operation.kind !== EXPORT_QUARTER_REPORT.kind ||
            operation.status !== "done" ||
            !isReportFile(operation.result)
        ) {
            throw new NotFoundException({
                message: "Report file not found",
                code: REPORT_FILE_ERRORS.notFound,
            });
        }
        const file = operation.result;
        if (new Date(file.expiresAt).getTime() <= Date.now()) {
            throw new GoneException({
                message: "Report file expired",
                code: REPORT_FILE_ERRORS.expired,
            });
        }
        return {
            body: await this.files.get(portalId, operationId, file.fileKey),
            contentType: PDF_MIME,
            fileName: file.fileName,
        };
    }
}
