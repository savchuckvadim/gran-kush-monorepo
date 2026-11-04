import type { QuarterPeriod } from "./report-period";

export const TAX_FORMS = ["es_303", "es_130"] as const;
export type TaxFormCode = (typeof TAX_FORMS)[number];

/**
 * Ячейка формы (casilla). `amount` — центы, `percent` — ставка. `entryIds` — проводки, из
 * которых сложилась сумма (для перехода к ним); у ячейки, посчитанной из других ячеек, пусто.
 */
export interface FormCell {
    code: string;
    kind: "amount" | "percent";
    value: number;
    computed: boolean;
    entryIds: readonly string[];
}

/** Почему форму не подают: режим организации её не предусматривает. */
export const FORM_NOT_APPLICABLE = {
    vatExempt: "vat_exempt",
    equivalenceSurcharge: "equivalence_surcharge",
    notSelfEmployed: "not_self_employed",
    objectiveRegime: "objective_regime",
} as const;
export type FormNotApplicable = (typeof FORM_NOT_APPLICABLE)[keyof typeof FORM_NOT_APPLICABLE];

/** Что gestor должен проверить сам: CRM этого не знает или не считает. */
export const FORM_NOTES = {
    /** Есть строки без ставки — заказы до включения финансов; в форму не попали */
    unclassified: "unclassified_lines",
    /** Ставка, которой нет в форме (своя ставка клуба) */
    unmappedRate: "unmapped_rate",
    /** Есть освобождённые доходы — вычет IVA может требовать пропорции (prorrata) */
    prorrata: "prorrata_review",
    /** Амортизации нет в учёте (TASK-806): в расходы 130 она не вошла */
    depreciation: "depreciation_missing",
    /** Платежи прошлых кварталов — по расчёту CRM, а не по поданным формам */
    previousPayments: "previous_payments_estimated",
} as const;
export type FormNote = (typeof FORM_NOTES)[keyof typeof FORM_NOTES];

export interface TaxFormReport {
    form: TaxFormCode;
    period: QuarterPeriod;
    applicable: boolean;
    reason: FormNotApplicable | null;
    cells: FormCell[];
    notes: FormNote[];
    /** Проводки, не попавшие в форму (см. `notes`) — чтобы их можно было открыть */
    skippedEntryIds: readonly string[];
}

export const amountCell = (
    code: string,
    value: number,
    entryIds: Iterable<string> = [],
    computed = false
): FormCell => ({ code, kind: "amount", value, computed, entryIds: [...new Set(entryIds)] });

export const percentCell = (code: string, value: number): FormCell => ({
    code,
    kind: "percent",
    value,
    computed: false,
    entryIds: [],
});

export const notApplicable = (
    form: TaxFormCode,
    period: QuarterPeriod,
    reason: FormNotApplicable
): TaxFormReport => ({
    form,
    period,
    applicable: false,
    reason,
    cells: [],
    notes: [],
    skippedEntryIds: [],
});

/** Ячейка формы по коду — для перехода к проводкам. */
export const cellOf = (report: TaxFormReport, code: string): FormCell | null =>
    report.cells.find((cell) => cell.code === code) ?? null;

/** Псевдоячейка «не попало в форму»: открывает `skippedEntryIds`. */
export const SKIPPED_CELL = "skipped";
