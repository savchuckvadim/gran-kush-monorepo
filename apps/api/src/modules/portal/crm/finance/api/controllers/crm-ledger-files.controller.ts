import {
    BadRequestException,
    Controller,
    Get,
    HttpCode,
    Post,
    Query,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";

import { MulterFile } from "@storage/domain/interfaces/storage-file.interface";
import type { Response } from "express";

import { CurrentPrincipal } from "@common/decorators/auth/current-principal.decorator";
import { PortalId } from "@common/decorators/auth/portal-id.decorator";
import { RequirePermission } from "@common/decorators/auth/require-permission.decorator";
import { ApiErrorResponse } from "@common/decorators/response/api-error-response.decorator";
import { ApiSuccessResponse } from "@common/decorators/response/api-success-response.decorator";
import type { PortalPrincipal } from "@common/portal";
import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { PERMISSIONS } from "@modules/portal/crm/access/domain/permissions";

import { LedgerTemplateService } from "../../application/services/ledger-template.service";
import { ExportLedgerUseCase } from "../../application/use-cases/export-ledger.use-case";
import { ImportLedgerUseCase } from "../../application/use-cases/import-ledger.use-case";
import { fromCents } from "../../domain/ledger/ledger-money";
import { FINANCE_LIMITS } from "../../finance.limits";
import { ImportReportDto } from "../dto/ledger-import.dto";
import { ExportQueryDto, ImportQueryDto, TemplateQueryDto } from "../dto/ledger-query.dto";
import { ledgerDownload } from "../ledger-download";

const IMPORT_FILE_MISSING = "import_file_missing";

/**
 * Таблицы учёта: шаблон и импорт — `finance.write` (ведёт тот, кто вносит расходы), выгрузка —
 * `finance.admin` (данные уходят из системы, каждая выгрузка — в журнал клуба).
 */
@ApiTags("CRM Finance")
@Controller("crm/finance")
@CrmAuth({ module: "finance" })
@ApiBearerAuth()
export class CrmLedgerFilesController {
    constructor(
        private readonly templates: LedgerTemplateService,
        private readonly importLedger: ImportLedgerUseCase,
        private readonly exportLedger: ExportLedgerUseCase
    ) {}

    @Get("import/template")
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({ summary: "Пример таблицы: три строки, статьи клуба, памятка по колонкам" })
    @ApiSuccessResponse(StreamableFile)
    @ApiErrorResponse([400, 401, 403])
    async template(
        @PortalId() portalId: string,
        @Query() query: TemplateQueryDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        return ledgerDownload(res, await this.templates.template(portalId, query.format ?? "xlsx"));
    }

    @Post("import")
    @HttpCode(200)
    @RequirePermission(PERMISSIONS.FinanceWrite)
    @ApiOperation({
        summary: "Импорт доходов и расходов таблицей (xlsx или csv)",
        description: "commit=false — отчёт по строкам без записи; commit=true — запись подходящих",
    })
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            required: ["file"],
            properties: { file: { type: "string", format: "binary" } },
        },
    })
    @UseInterceptors(
        FileInterceptor("file", { limits: { fileSize: FINANCE_LIMITS.importBytes, files: 1 } })
    )
    @ApiSuccessResponse(ImportReportDto)
    @ApiErrorResponse([400, 401, 403, 409, 413])
    async import(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Query() query: ImportQueryDto,
        @UploadedFile() file: MulterFile | undefined
    ): Promise<ImportReportDto> {
        if (!file) {
            throw new BadRequestException({
                message: "Attach a spreadsheet",
                code: IMPORT_FILE_MISSING,
            });
        }
        const report = await this.importLedger.execute(
            portalId,
            principal.membershipId,
            file.buffer,
            query.commit ?? false
        );
        return {
            ...report,
            rows: report.rows.map((row) => ({
                ...row,
                preview: row.preview
                    ? { ...row.preview, total: fromCents(row.preview.total) }
                    : null,
            })),
        };
    }

    @Get("export")
    @RequirePermission(PERMISSIONS.FinanceAdmin)
    @ApiOperation({
        summary: "Выгрузка за период: проводки или книги compras y gastos / ventas e ingresos",
    })
    @ApiSuccessResponse(StreamableFile)
    @ApiErrorResponse([400, 401, 403])
    async export(
        @PortalId() portalId: string,
        @CurrentPrincipal() principal: PortalPrincipal,
        @Query() query: ExportQueryDto,
        @Res({ passthrough: true }) res: Response
    ): Promise<StreamableFile> {
        const file = await this.exportLedger.execute(portalId, principal.membershipId, {
            from: query.from,
            to: query.to,
            book: query.book,
            format: query.format ?? "xlsx",
        });
        return ledgerDownload(res, file);
    }
}
