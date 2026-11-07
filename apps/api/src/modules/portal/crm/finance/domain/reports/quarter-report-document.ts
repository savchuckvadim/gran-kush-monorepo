import { categoryLabel, type FinanceCategory } from "../ledger/finance-category";
import type { LedgerSummary } from "../ledger/ledger-summary";
import type { OrganizationIdentity } from "../organization/organization-profile";

import type { AccountFlow } from "./account-flows";
import type { ReportDocument, ReportRow, ReportSection } from "./report-document";
import {
    ACCOUNT_LABELS,
    FORM_CELL_LABELS,
    FORM_NOTE_LABELS,
    FORM_REASONS,
    FORM_TITLES,
    REPORT_TEXT,
    TREATMENT_LABELS,
} from "./report-labels";
import type { QuarterPeriod } from "./report-period";
import type { TaxFormReport } from "./tax-form";
import type { VatRow } from "./vat-breakdown";
import type { WithholdingTotals } from "./withholding-totals";

export interface QuarterReportInput {
    identity: OrganizationIdentity;
    period: QuarterPeriod;
    summary: LedgerSummary;
    categories: readonly FinanceCategory[];
    vat: { output: VatRow[]; input: VatRow[]; outputTax: number; inputTax: number };
    withholding: WithholdingTotals;
    accounts: AccountFlow[];
    forms: TaxFormReport[];
    generatedAt: Date;
    timeZone: string;
}

const LOCALE = "es-ES";
const CENTS = 100;

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR" });
const euros = (cents: number): string => money.format(cents / CENTS);

/** `2026-10-01` → `01/10/2026`: так даты читает gestor. */
const spanishDate = (iso: string): string => iso.split("-").reverse().join("/");

const organizationLines = (identity: OrganizationIdentity): string[] => {
    const place = [identity.postalCode, identity.city, identity.province].filter(Boolean).join(" ");
    return [
        identity.legalName ?? identity.tradeName ?? "",
        identity.taxId ? `NIF ${identity.taxId}` : REPORT_TEXT.noTaxId,
        [identity.addressLine, place].filter(Boolean).join(", "),
    ].filter((line) => line.length > 0);
};

const summarySection = (summary: LedgerSummary): ReportSection => ({
    title: REPORT_TEXT.summary,
    notes: [],
    columns: [
        { title: REPORT_TEXT.concept, align: "left", width: 0.6 },
        { title: REPORT_TEXT.amount, align: "right", width: 0.4 },
    ],
    rows: [
        { cells: [REPORT_TEXT.income, euros(summary.income.net)] },
        { cells: [REPORT_TEXT.expense, euros(summary.expense.net)] },
        { cells: [REPORT_TEXT.result, euros(summary.result)], strong: true },
    ],
});

const categoriesSection = (
    summary: LedgerSummary,
    categories: readonly FinanceCategory[]
): ReportSection => {
    const byId = new Map(categories.map((category) => [category.id, category]));
    const rowsOf = (direction: "income" | "expense"): ReportRow[] =>
        summary.byCategory
            .filter((row) => row.direction === direction)
            .map((row) => {
                const category = byId.get(row.categoryId);
                return {
                    cells: [
                        category ? categoryLabel(category) : REPORT_TEXT.uncategorized,
                        String(row.count),
                        euros(row.net),
                    ],
                };
            });
    return {
        title: REPORT_TEXT.categories,
        notes: [],
        columns: [
            { title: REPORT_TEXT.category, align: "left", width: 0.55 },
            { title: REPORT_TEXT.documents, align: "right", width: 0.15 },
            { title: REPORT_TEXT.base, align: "right", width: 0.3 },
        ],
        rows: [
            { cells: [REPORT_TEXT.income, "", euros(summary.income.net)], strong: true },
            ...rowsOf("income"),
            { cells: [REPORT_TEXT.expense, "", euros(summary.expense.net)], strong: true },
            ...rowsOf("expense"),
        ],
    };
};

const formSection = (form: TaxFormReport): ReportSection => ({
    title: FORM_TITLES[form.form],
    notes: form.applicable
        ? form.notes.map((note) => FORM_NOTE_LABELS[note])
        : [form.reason ? FORM_REASONS[form.reason] : ""],
    columns: [
        { title: REPORT_TEXT.cell, align: "left", width: 0.12 },
        { title: REPORT_TEXT.concept, align: "left", width: 0.6 },
        { title: REPORT_TEXT.amount, align: "right", width: 0.28 },
    ],
    rows: form.cells.map((cell) => ({
        cells: [
            `[${cell.code}]`,
            FORM_CELL_LABELS[form.form][cell.code] ?? cell.code,
            cell.kind === "percent" ? `${cell.value} %` : euros(cell.value),
        ],
        strong: cell.computed,
    })),
});

const rateLabel = (row: VatRow): string => {
    if (row.treatment === null) return REPORT_TEXT.noRate;
    return row.treatment === "taxable" ? `${row.percent} %` : TREATMENT_LABELS[row.treatment];
};

const vatSection = (title: string, rows: readonly VatRow[], total: number): ReportSection => ({
    title,
    notes: [],
    columns: [
        { title: REPORT_TEXT.rate, align: "left", width: 0.4 },
        { title: REPORT_TEXT.base, align: "right", width: 0.3 },
        { title: REPORT_TEXT.tax, align: "right", width: 0.3 },
    ],
    rows: [
        ...rows.map((row) => ({ cells: [rateLabel(row), euros(row.base), euros(row.tax)] })),
        { cells: [REPORT_TEXT.total, "", euros(total)], strong: true },
    ],
});

const withholdingSection = (totals: WithholdingTotals): ReportSection => ({
    title: REPORT_TEXT.withholdings,
    notes: [],
    columns: [
        { title: REPORT_TEXT.concept, align: "left", width: 0.5 },
        { title: REPORT_TEXT.base, align: "right", width: 0.25 },
        { title: REPORT_TEXT.amount, align: "right", width: 0.25 },
    ],
    rows: [
        {
            cells: [
                REPORT_TEXT.received,
                euros(totals.received.base),
                euros(totals.received.amount),
            ],
        },
        {
            cells: [REPORT_TEXT.applied, euros(totals.applied.base), euros(totals.applied.amount)],
        },
    ],
});

const accountsSection = (accounts: readonly AccountFlow[]): ReportSection => ({
    title: REPORT_TEXT.accounts,
    notes: [],
    columns: [
        { title: REPORT_TEXT.account, align: "left", width: 0.2 },
        { title: REPORT_TEXT.opening, align: "right", width: 0.2 },
        { title: REPORT_TEXT.inflow, align: "right", width: 0.2 },
        { title: REPORT_TEXT.outflow, align: "right", width: 0.2 },
        { title: REPORT_TEXT.closing, align: "right", width: 0.2 },
    ],
    rows: accounts.map((flow) => ({
        cells: [
            ACCOUNT_LABELS[flow.account],
            euros(flow.opening),
            euros(flow.inflow),
            euros(flow.outflow),
            euros(flow.closing),
        ],
    })),
});

/**
 * Квартальный отчёт для gestor: результат и статьи, цифры форм, IVA по ставкам, удержания,
 * касса и банк. Время формирования — в часовом поясе клуба.
 */
export const quarterReportDocument = (input: QuarterReportInput): ReportDocument => {
    const { period } = input;
    const generated = new Intl.DateTimeFormat(LOCALE, {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: input.timeZone,
    }).format(input.generatedAt);
    return {
        title: REPORT_TEXT.title,
        organization: organizationLines(input.identity),
        subtitle: REPORT_TEXT.subtitle(
            period.quarter,
            period.year,
            spanishDate(period.from),
            spanishDate(period.to)
        ),
        generatedAt: REPORT_TEXT.generatedAt(generated),
        sections: [
            summarySection(input.summary),
            ...input.forms.map(formSection),
            vatSection(REPORT_TEXT.vatOutput, input.vat.output, input.vat.outputTax),
            vatSection(REPORT_TEXT.vatInput, input.vat.input, input.vat.inputTax),
            withholdingSection(input.withholding),
            accountsSection(input.accounts),
            categoriesSection(input.summary, input.categories),
        ],
        footer: REPORT_TEXT.footer,
    };
};
