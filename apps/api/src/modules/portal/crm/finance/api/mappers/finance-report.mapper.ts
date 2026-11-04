import type { PeriodReport } from "../../application/services/finance-reports.service";
import { fromCents } from "../../domain/ledger/ledger-money";
import type { FormCell, TaxFormReport } from "../../domain/reports/tax-form";
import type { VatRow } from "../../domain/reports/vat-breakdown";
import type { WithholdingSide } from "../../domain/reports/withholding-totals";
import type {
    FormCellDto,
    PeriodReportDto,
    TaxFormDto,
    VatRowDto,
    WithholdingSideDto,
} from "../dto/finance-report.dto";

const vatRow = (row: VatRow): VatRowDto => ({
    ...row,
    base: fromCents(row.base),
    tax: fromCents(row.tax),
});

const withholdingSide = (side: WithholdingSide): WithholdingSideDto => ({
    ...side,
    base: fromCents(side.base),
    amount: fromCents(side.amount),
});

export const toPeriodReportDto = (report: PeriodReport): PeriodReportDto => ({
    from: report.from,
    to: report.to,
    vat: {
        output: report.vat.output.map(vatRow),
        input: report.vat.input.map(vatRow),
        outputTax: fromCents(report.vat.outputTax),
        inputTax: fromCents(report.vat.inputTax),
        balance: fromCents(report.vat.balance),
    },
    withholding: {
        received: withholdingSide(report.withholding.received),
        applied: withholdingSide(report.withholding.applied),
    },
    accounts: report.accounts.map((flow) => ({
        account: flow.account,
        opening: fromCents(flow.opening),
        inflow: fromCents(flow.inflow),
        outflow: fromCents(flow.outflow),
        closing: fromCents(flow.closing),
    })),
});

const formCell = (cell: FormCell): FormCellDto => ({
    code: cell.code,
    kind: cell.kind,
    value: cell.kind === "amount" ? fromCents(cell.value) : cell.value,
    computed: cell.computed,
    entryCount: cell.entryIds.length,
});

export const toTaxFormDto = (report: TaxFormReport): TaxFormDto => ({
    form: report.form,
    year: report.period.year,
    quarter: report.period.quarter,
    from: report.period.from,
    to: report.period.to,
    applicable: report.applicable,
    reason: report.reason,
    cells: report.cells.map(formCell),
    notes: report.notes,
    skippedCount: report.skippedEntryIds.length,
});
