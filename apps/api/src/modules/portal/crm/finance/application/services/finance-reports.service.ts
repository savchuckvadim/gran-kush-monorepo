import { Injectable, NotFoundException } from "@nestjs/common";

import type { LedgerEntry } from "../../domain/ledger/ledger-entry";
import { type AccountFlow, accountFlows } from "../../domain/reports/account-flows";
import { esForm130 } from "../../domain/reports/es-form-130";
import { esForm303 } from "../../domain/reports/es-form-303";
import {
    type Quarter,
    type QuarterPeriod,
    quarterPeriod,
    yearStartOf,
} from "../../domain/reports/report-period";
import {
    cellOf,
    SKIPPED_CELL,
    type TaxFormCode,
    type TaxFormReport,
} from "../../domain/reports/tax-form";
import { type VatBreakdown, vatBreakdown } from "../../domain/reports/vat-breakdown";
import { type WithholdingTotals, withholdingTotals } from "../../domain/reports/withholding-totals";
import { LedgerRepository } from "../../domain/repositories/ledger-repository.interface";

import { LedgerEntriesService, type LedgerEntryView } from "./ledger-entries.service";
import { OrganizationProfileService } from "./organization-profile.service";

/** Налоги и деньги периода: IVA по ставкам, удержания IRPF, касса и банк. */
export interface PeriodReport {
    from: string;
    to: string;
    vat: VatBreakdown;
    withholding: WithholdingTotals;
    accounts: AccountFlow[];
}

/** Формы считаются только для Испании: других пресетов стран пока нет. */
const FORMS_COUNTRY = "ES";

export const REPORT_ERRORS = { cellNotFound: "report_cell_not_found" } as const;

interface FormsComputation {
    period: QuarterPeriod;
    reports: TaxFormReport[];
    entries: LedgerEntry[];
}

/**
 * Отчёты учёта (TASK-799): отчёт за период и «цифры для форм» за квартал с переходом к
 * проводкам ячейки. Всё считается по проведённым проводкам на лету — суммы лежат шифром, и
 * сложить их можно только после расшифровки; кэша нет, чтобы отчёт не расходился с реестром.
 */
@Injectable()
export class FinanceReportsService {
    constructor(
        private readonly ledger: LedgerRepository,
        private readonly entries: LedgerEntriesService,
        private readonly profiles: OrganizationProfileService
    ) {}

    async period(portalId: string, from: string, to: string): Promise<PeriodReport> {
        const untilEnd = await this.ledger.listAll(portalId, { to, includeVoid: false });
        const inPeriod = untilEnd.filter((entry) => entry.occurredOn >= from);
        return {
            from,
            to,
            vat: vatBreakdown(inPeriod),
            withholding: withholdingTotals(inPeriod),
            accounts: accountFlows(untilEnd, from),
        };
    }

    async forms(portalId: string, year: number, quarter: Quarter): Promise<TaxFormReport[]> {
        return (await this.compute(portalId, year, quarter)).reports;
    }

    /** Проводки ячейки формы (или пропущенные формой — `skipped`), новые сверху. */
    async cellEntries(
        portalId: string,
        query: { year: number; quarter: Quarter; form: TaxFormCode; cell: string },
        page: { skip: number; take: number }
    ): Promise<{ items: LedgerEntryView[]; total: number }> {
        const { reports, entries } = await this.compute(portalId, query.year, query.quarter);
        const report = reports.find((candidate) => candidate.form === query.form);
        const ids =
            query.cell === SKIPPED_CELL
                ? report?.skippedEntryIds
                : report && cellOf(report, query.cell)?.entryIds;
        if (!ids) {
            throw new NotFoundException({
                message: "Report cell not found",
                code: REPORT_ERRORS.cellNotFound,
            });
        }
        const wanted = new Set(ids);
        const matched = entries
            .filter((entry) => wanted.has(entry.id))
            .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
        return {
            items: await this.entries.views(
                portalId,
                matched.slice(page.skip, page.skip + page.take)
            ),
            total: matched.length,
        };
    }

    private async compute(
        portalId: string,
        year: number,
        quarter: Quarter
    ): Promise<FormsComputation> {
        const period = quarterPeriod(year, quarter);
        const { profile } = await this.profiles.get(portalId);
        if (profile.country !== FORMS_COUNTRY) return { period, reports: [], entries: [] };
        const entries = await this.ledger.listAll(portalId, {
            from: yearStartOf(period),
            to: period.to,
            includeVoid: false,
        });
        const inQuarter = entries.filter((entry) => entry.occurredOn >= period.from);
        return {
            period,
            reports: [esForm303(inQuarter, profile, period), esForm130(entries, profile, period)],
            entries,
        };
    }
}
