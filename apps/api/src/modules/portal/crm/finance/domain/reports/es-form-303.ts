import { LedgerDirection, TaxTreatment, VatRegime } from "@prisma/client";

import type { LedgerEntry, LedgerLine } from "../ledger/ledger-entry";
import type { OrganizationTaxSettings } from "../organization/organization-profile";

import type { QuarterPeriod } from "./report-period";
import {
    amountCell,
    FORM_NOT_APPLICABLE,
    FORM_NOTES,
    type FormCell,
    type FormNote,
    notApplicable,
    percentCell,
    type TaxFormReport,
} from "./tax-form";

interface RateCells {
    percent: number;
    base: string;
    rate: string;
    tax: string;
    /** Строку показываем и пустой: так выглядит бланк */
    always: boolean;
}

/** Строки начисленного IVA режима general в порядке бланка: 0 %, 4 %, 5 %, 10 %, 21 %. */
const RATE_ROWS: readonly RateCells[] = [
    { percent: 0, base: "150", rate: "151", tax: "152", always: false },
    { percent: 4, base: "01", rate: "02", tax: "03", always: true },
    { percent: 5, base: "153", rate: "154", tax: "155", always: false },
    { percent: 10, base: "04", rate: "05", tax: "06", always: true },
    { percent: 21, base: "07", rate: "08", tax: "09", always: true },
];

/** Исправления начисленного (сторно, возвраты): база и налог. */
const OUTPUT_CORRECTION = { base: "14", tax: "15" } as const;
/** Вычет по текущим операциям внутри страны: база и налог. */
const INPUT_CURRENT = { base: "28", tax: "29" } as const;
/** Исправления вычетов: база и налог. */
const INPUT_CORRECTION = { base: "40", tax: "41" } as const;
const TOTAL_OUTPUT = "27";
const TOTAL_INPUT = "45";
const RESULT = "46";

class Sum {
    value = 0;
    readonly ids = new Set<string>();

    add(cents: number, entryId: string): void {
        this.value += cents;
        this.ids.add(entryId);
    }
}

class Cells {
    private readonly sums = new Map<string, Sum>();

    add(code: string, cents: number, entryId: string): void {
        const sum = this.sums.get(code) ?? new Sum();
        sum.add(cents, entryId);
        this.sums.set(code, sum);
    }

    has(code: string): boolean {
        return this.sums.has(code);
    }

    value(code: string): number {
        return this.sums.get(code)?.value ?? 0;
    }

    cell(code: string): FormCell {
        return amountCell(code, this.value(code), this.sums.get(code)?.ids ?? []);
    }
}

const isCorrection = (line: LedgerLine): boolean => line.net < 0 || line.tax < 0;

/**
 * Модель 303 (IVA, квартал) режима general по проводкам квартала.
 * - Начисленный IVA — строки доходов с налогом по ставкам 0/4/5/10/21 % (01–09, 150–155);
 *   строки с минусом (сторно, возвраты) — в исправления 14/15. Итог 27.
 * - К вычету — строки расходов с налогом: текущие 28/29, с минусом — 40/41. Итог 45.
 * - Результат 46 = 27 − 45. Компенсации прошлых периодов (110, 78) и доля государства (65) — у
 *   gestor: CRM не знает поданных деклараций.
 * - Exenta и no sujeta в форму не входят; освобождённые доходы — пометка о пропорции вычета.
 * - Строки без ставки (заказы до включения финансов) и своя ставка вне бланка — пропущены с
 *   пометкой, их проводки доступны через `skippedEntryIds`.
 * Освобождённая организация и recargo de equivalencia 303 по этой деятельности не подают.
 */
export const esForm303 = (
    entries: readonly LedgerEntry[],
    settings: Pick<OrganizationTaxSettings, "vatRegime">,
    period: QuarterPeriod
): TaxFormReport => {
    if (settings.vatRegime === VatRegime.exempt) {
        return notApplicable("es_303", period, FORM_NOT_APPLICABLE.vatExempt);
    }
    if (settings.vatRegime === VatRegime.equivalence_surcharge) {
        return notApplicable("es_303", period, FORM_NOT_APPLICABLE.equivalenceSurcharge);
    }
    const cells = new Cells();
    const notes = new Set<FormNote>();
    const skipped = new Set<string>();
    let exemptIncome = false;

    for (const entry of entries) {
        if (entry.direction === LedgerDirection.transfer) continue;
        const income = entry.direction === LedgerDirection.income;
        for (const line of entry.secret.lines) {
            if (line.treatment === null) {
                notes.add(FORM_NOTES.unclassified);
                skipped.add(entry.id);
                continue;
            }
            if (line.treatment !== TaxTreatment.taxable) {
                if (income && line.treatment === TaxTreatment.exempt) exemptIncome = true;
                continue;
            }
            if (!income) {
                const target = isCorrection(line) ? INPUT_CORRECTION : INPUT_CURRENT;
                cells.add(target.base, line.net, entry.id);
                cells.add(target.tax, line.tax, entry.id);
                continue;
            }
            if (isCorrection(line)) {
                cells.add(OUTPUT_CORRECTION.base, line.net, entry.id);
                cells.add(OUTPUT_CORRECTION.tax, line.tax, entry.id);
                continue;
            }
            const row = RATE_ROWS.find((candidate) => candidate.percent === line.percent);
            if (!row) {
                notes.add(FORM_NOTES.unmappedRate);
                skipped.add(entry.id);
                continue;
            }
            cells.add(row.base, line.net, entry.id);
            cells.add(row.tax, line.tax, entry.id);
        }
    }
    if (exemptIncome && (cells.has(INPUT_CURRENT.tax) || cells.has(INPUT_CORRECTION.tax))) {
        notes.add(FORM_NOTES.prorrata);
    }

    const output: FormCell[] = [];
    for (const row of RATE_ROWS) {
        if (!row.always && !cells.has(row.base)) continue;
        output.push(cells.cell(row.base), percentCell(row.rate, row.percent), cells.cell(row.tax));
    }
    if (cells.has(OUTPUT_CORRECTION.base)) {
        output.push(cells.cell(OUTPUT_CORRECTION.base), cells.cell(OUTPUT_CORRECTION.tax));
    }
    const outputTax =
        RATE_ROWS.reduce((sum, row) => sum + cells.value(row.tax), 0) +
        cells.value(OUTPUT_CORRECTION.tax);
    const input = [cells.cell(INPUT_CURRENT.base), cells.cell(INPUT_CURRENT.tax)];
    if (cells.has(INPUT_CORRECTION.base)) {
        input.push(cells.cell(INPUT_CORRECTION.base), cells.cell(INPUT_CORRECTION.tax));
    }
    const inputTax = cells.value(INPUT_CURRENT.tax) + cells.value(INPUT_CORRECTION.tax);

    return {
        form: "es_303",
        period,
        applicable: true,
        reason: null,
        cells: [
            ...output,
            amountCell(TOTAL_OUTPUT, outputTax, [], true),
            ...input,
            amountCell(TOTAL_INPUT, inputTax, [], true),
            amountCell(RESULT, outputTax - inputTax, [], true),
        ],
        notes: [...notes],
        skippedEntryIds: [...skipped],
    };
};
