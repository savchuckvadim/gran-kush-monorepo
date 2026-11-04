import { LedgerDirection, type TaxTreatment } from "@prisma/client";

import type { LedgerEntry } from "../ledger/ledger-entry";

/** База и налог одной ставки в центах; сторно входит со своим знаком. */
export interface VatRow {
    percent: number;
    /** `null` — строки без разбивки: заказ оформлен до включения финансов */
    treatment: TaxTreatment | null;
    base: number;
    tax: number;
    count: number;
}

/**
 * IVA периода: начисленный с доходов (repercutido) и уплаченный в расходах (soportado) по
 * ставкам. `balance` — начисленный минус уплаченный: без проверки, какой налог можно принять к
 * вычету, — это делает форма 303.
 */
export interface VatBreakdown {
    output: VatRow[];
    input: VatRow[];
    outputTax: number;
    inputTax: number;
    balance: number;
}

const keyOf = (treatment: TaxTreatment | null, percent: number): string =>
    `${treatment ?? "none"}|${percent}`;

const rowsOf = (entries: readonly LedgerEntry[]): VatRow[] => {
    const rows = new Map<string, VatRow>();
    for (const entry of entries) {
        const counted = new Set<string>();
        for (const line of entry.secret.lines) {
            const key = keyOf(line.treatment, line.percent);
            const row = rows.get(key) ?? {
                percent: line.percent,
                treatment: line.treatment,
                base: 0,
                tax: 0,
                count: 0,
            };
            row.base += line.net;
            row.tax += line.tax;
            if (!counted.has(key)) row.count += 1;
            counted.add(key);
            rows.set(key, row);
        }
    }
    return [...rows.values()].sort((a, b) => b.percent - a.percent || b.base - a.base);
};

const taxOf = (rows: readonly VatRow[]): number => rows.reduce((sum, row) => sum + row.tax, 0);

export const vatBreakdown = (entries: readonly LedgerEntry[]): VatBreakdown => {
    const output = rowsOf(entries.filter((entry) => entry.direction === LedgerDirection.income));
    const input = rowsOf(entries.filter((entry) => entry.direction === LedgerDirection.expense));
    const outputTax = taxOf(output);
    const inputTax = taxOf(input);
    return { output, input, outputTax, inputTax, balance: outputTax - inputTax };
};
