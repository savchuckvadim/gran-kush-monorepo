import { FinanceAccount, TaxTreatment } from "@prisma/client";

import type { CategoryDirection } from "../ledger/finance-category";
import { toCents } from "../ledger/ledger-money";
import { comparableText } from "../text";

/** Значение ячейки после чтения файла: xlsx отдаёт числа и даты, csv — строки. */
export type Cell = string | number | Date | null;

export const textOf = (cell: Cell): string | null => {
    if (cell === null) return null;
    if (cell instanceof Date) return cell.toISOString().slice(0, 10);
    const text = String(cell).trim();
    return text === "" ? null : text;
};

const word = (cell: Cell): string => comparableText(textOf(cell) ?? "").replace(/ /g, "_");

const DIRECTIONS: Readonly<Record<string, CategoryDirection>> = {
    gasto: "expense",
    gastos: "expense",
    compra: "expense",
    expense: "expense",
    ingreso: "income",
    ingresos: "income",
    venta: "income",
    income: "income",
};

export const parseDirection = (cell: Cell): CategoryDirection | null =>
    DIRECTIONS[word(cell)] ?? null;

const ACCOUNTS: Readonly<Record<string, FinanceAccount>> = {
    banco: FinanceAccount.bank,
    bank: FinanceAccount.bank,
    transferencia: FinanceAccount.bank,
    caja: FinanceAccount.cash,
    efectivo: FinanceAccount.cash,
    metalico: FinanceAccount.cash,
    cash: FinanceAccount.cash,
    tarjeta: FinanceAccount.card,
    card: FinanceAccount.card,
    tpv: FinanceAccount.card,
};

export const parseAccount = (cell: Cell): FinanceAccount | null => ACCOUNTS[word(cell)] ?? null;

const isRealDate = (year: number, month: number, day: number): boolean => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
};

const isoOf = (year: number, month: number, day: number): string | null =>
    isRealDate(year, month, day)
        ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        : null;

/** Серийный номер даты Excel (дни с 30.12.1899) — дата, введённая числом. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;
const EXCEL_SERIAL_RANGE = { min: 20_000, max: 80_000 };

/** Дата: ячейка-дата, `2026-10-05`, испанское `05/10/2026` (день первым) или серийный номер Excel. */
export const parseDate = (cell: Cell): string | null => {
    if (cell instanceof Date)
        return Number.isNaN(cell.getTime()) ? null : cell.toISOString().slice(0, 10);
    if (typeof cell === "number") {
        if (cell < EXCEL_SERIAL_RANGE.min || cell > EXCEL_SERIAL_RANGE.max) return null;
        return new Date(EXCEL_EPOCH_MS + Math.round(cell) * DAY_MS).toISOString().slice(0, 10);
    }
    const text = textOf(cell);
    if (!text) return null;
    const iso = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(text);
    if (iso) return isoOf(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const local = /^([0-9]{1,2})[/.-]([0-9]{1,2})[/.-]([0-9]{2}|[0-9]{4})$/.exec(text);
    if (!local) return null;
    const year = local[3].length === 2 ? 2000 + Number(local[3]) : Number(local[3]);
    return isoOf(year, Number(local[2]), Number(local[1]));
};

/**
 * Сумма в центах: число ячейки или строка `1.234,56` / `1,234.56` / `1234,56` — десятичный
 * разделитель последний из встретившихся, знак евро и пробелы не мешают.
 */
export const parseAmount = (cell: Cell): number | null => {
    if (typeof cell === "number") return Number.isFinite(cell) ? toCents(cell) : null;
    let text = textOf(cell)?.replace(/[€\s]/g, "");
    if (!text) return null;
    const decimal = Math.max(text.lastIndexOf(","), text.lastIndexOf("."));
    if (decimal >= 0) {
        text = `${text.slice(0, decimal).replace(/[.,]/g, "")}.${text.slice(decimal + 1)}`;
    }
    return /^-?[0-9]+(\.[0-9]+)?$/.test(text) ? toCents(Number(text)) : null;
};

const TREATMENT_WORDS: Readonly<Record<string, TaxTreatment>> = {
    exenta: TaxTreatment.exempt,
    exento: TaxTreatment.exempt,
    exempt: TaxTreatment.exempt,
    no_sujeta: TaxTreatment.not_subject,
    no_sujeto: TaxTreatment.not_subject,
    not_subject: TaxTreatment.not_subject,
};

export interface ParsedRate {
    percent: number;
    treatment: TaxTreatment;
}

/**
 * Ставка: `21`, `21%`, `10,5`, процентная ячейка Excel (`0,21`), `exenta`, `no sujeta`. Пусто —
 * 0 % (облагаемая операция без налога), как в шаблоне.
 */
export const parseRate = (cell: Cell): ParsedRate | null => {
    const text = textOf(cell);
    if (text === null) return { percent: 0, treatment: TaxTreatment.taxable };
    const treatment = TREATMENT_WORDS[word(cell)];
    if (treatment) return { percent: 0, treatment };
    const raw =
        typeof cell === "number" ? cell : Number(text.replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(raw)) return null;
    const percent = typeof cell === "number" && raw > 0 && raw < 1 ? raw * 100 : raw;
    return percent >= 0 && percent <= 100
        ? { percent: Math.round(percent * 100) / 100, treatment: TaxTreatment.taxable }
        : null;
};
