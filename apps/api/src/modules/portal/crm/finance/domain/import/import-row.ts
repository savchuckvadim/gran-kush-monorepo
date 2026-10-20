import type { FinanceAccount } from "@prisma/client";

import { HOME_COUNTRY, parseTaxId } from "../ledger/counterparty";
import type { CategoryDirection, FinanceCategory } from "../ledger/finance-category";
import type { LedgerLine, LedgerWithholding } from "../ledger/ledger-entry";
import { lineFromAmount, withholdingOf } from "../ledger/ledger-money";

import type { ImportColumn } from "./import-columns";
import {
    type Cell,
    parseAccount,
    parseAmount,
    parseDate,
    parseDirection,
    type ParsedRate,
    parseRate,
    textOf,
} from "./import-values";

/** Коды причин по строке: CRM переводит их и подсвечивает колонку. */
export const IMPORT_ISSUES = {
    required: "required",
    invalid: "invalid",
    unknownCategory: "unknown_category",
    categoryDirection: "category_direction",
    taxMismatch: "tax_mismatch",
    totalMismatch: "total_mismatch",
    periodClosed: "period_closed",
    duplicate: "duplicate",
    alreadyImported: "already_imported",
} as const;
export type ImportIssueCode = (typeof IMPORT_ISSUES)[keyof typeof IMPORT_ISSUES];

export interface ImportIssue {
    column: ImportColumn | null;
    code: ImportIssueCode;
}

export interface ImportCounterparty {
    name: string;
    nif: string | null;
    country: string;
}

/** Строка таблицы, готовая стать проводкой. Суммы — в центах. */
export interface ImportDraft {
    direction: CategoryDirection;
    occurredOn: string;
    category: FinanceCategory;
    description: string;
    counterparty: ImportCounterparty | null;
    documentNumber: string | null;
    line: LedgerLine;
    withholding: LedgerWithholding | null;
    account: FinanceAccount;
    paidOn: string | null;
    notes: string | null;
}

/** Расхождение до цента — округление в программе, где считали фактуру, а не ошибка. */
const ROUNDING_TOLERANCE_CENTS = 1;

const near = (a: number, b: number): boolean => Math.abs(a - b) <= ROUNDING_TOLERANCE_CENTS;

type Cells = Partial<Record<ImportColumn, Cell>>;

type RowFields = Omit<ImportDraft, "line" | "withholding"> & {
    base: number;
    rate: ParsedRate;
    withholdingPercent: number;
};

const cellOf = (cells: Cells, column: ImportColumn): Cell => cells[column] ?? null;

const isEmpty = (cells: Cells, column: ImportColumn): boolean =>
    textOf(cellOf(cells, column)) === null;

const counterpartyOf = (cells: Cells, issues: ImportIssue[]): ImportCounterparty | null => {
    const name = textOf(cellOf(cells, "contraparte"));
    const rawNif = textOf(cellOf(cells, "nif"));
    if (!name && !rawNif) return null;
    const nif = rawNif ? parseTaxId(rawNif) : null;
    if (rawNif && !nif) {
        issues.push({ column: "nif", code: IMPORT_ISSUES.invalid });
        return null;
    }
    return {
        name: name ?? nif?.value ?? "",
        nif: nif?.value ?? null,
        country: nif?.country ?? HOME_COUNTRY,
    };
};

const categoryOf = (
    cells: Cells,
    categories: ReadonlyMap<string, FinanceCategory>,
    direction: CategoryDirection | null,
    issues: ImportIssue[]
): FinanceCategory | null => {
    const code = textOf(cellOf(cells, "categoria"))?.toLowerCase();
    const category = code ? categories.get(code) : undefined;
    if (!code) issues.push({ column: "categoria", code: IMPORT_ISSUES.required });
    else if (!category) issues.push({ column: "categoria", code: IMPORT_ISSUES.unknownCategory });
    else if (direction && category.direction !== direction) {
        issues.push({ column: "categoria", code: IMPORT_ISSUES.categoryDirection });
    } else return category;
    return null;
};

/** Поля строки без сумм налога; пустая или кривая обязательная ячейка — причина в `issues`. */
const readFields = (
    cells: Cells,
    categories: ReadonlyMap<string, FinanceCategory>,
    issues: ImportIssue[]
): RowFields | null => {
    const need = <T>(column: ImportColumn, value: T | null): T | null => {
        if (value === null) {
            const code = isEmpty(cells, column) ? IMPORT_ISSUES.required : IMPORT_ISSUES.invalid;
            issues.push({ column, code });
        }
        return value;
    };
    const optional = <T>(column: ImportColumn, parse: (cell: Cell) => T | null): T | null => {
        if (isEmpty(cells, column)) return null;
        const value = parse(cellOf(cells, column));
        if (value === null) issues.push({ column, code: IMPORT_ISSUES.invalid });
        return value;
    };
    const direction = need("tipo", parseDirection(cellOf(cells, "tipo")));
    const occurredOn = need("fecha", parseDate(cellOf(cells, "fecha")));
    const description = need("concepto", textOf(cellOf(cells, "concepto")));
    const base = need("base", parseAmount(cellOf(cells, "base")));
    const account = need("pago", parseAccount(cellOf(cells, "pago")));
    const rate = need("iva_pct", parseRate(cellOf(cells, "iva_pct")));
    const withholding = need("irpf_pct", parseRate(cellOf(cells, "irpf_pct")));
    const paidOn = optional("fecha_pago", parseDate);
    const category = categoryOf(cells, categories, direction, issues);
    const counterparty = counterpartyOf(cells, issues);
    if (!direction || !occurredOn || !description || base === null || !account) return null;
    if (!rate || !withholding || !category) return null;
    return {
        direction,
        occurredOn,
        category,
        description,
        counterparty,
        documentNumber: textOf(cellOf(cells, "documento")),
        account,
        paidOn,
        notes: textOf(cellOf(cells, "notas")),
        base,
        rate,
        withholdingPercent: withholding.percent,
    };
};

/**
 * Строка шаблона → черновик проводки или причины отказа. Налог считается от базы; заполненные
 * IVA и итог сверяются с расчётом до цента (итог = база + IVA − IRPF), IVA из фактуры важнее.
 */
export const parseImportRow = (
    cells: Cells,
    categories: ReadonlyMap<string, FinanceCategory>
): { draft: ImportDraft | null; issues: ImportIssue[] } => {
    const issues: ImportIssue[] = [];
    const fields = readFields(cells, categories, issues);
    if (!fields || issues.length > 0) return { draft: null, issues };
    const { base, rate, withholdingPercent, ...rest } = fields;
    const computed = lineFromAmount(base, { ...rate, includesTax: false });
    const givenTax = isEmpty(cells, "iva") ? null : parseAmount(cellOf(cells, "iva"));
    if (!isEmpty(cells, "iva") && (givenTax === null || !near(givenTax, computed.tax))) {
        issues.push({ column: "iva", code: IMPORT_ISSUES.taxMismatch });
    }
    const line = givenTax === null ? computed : { ...computed, tax: givenTax };
    const withholding = withholdingOf(line.net, withholdingPercent);
    const total = line.net + line.tax - (withholding?.amount ?? 0);
    const givenTotal = isEmpty(cells, "total") ? null : parseAmount(cellOf(cells, "total"));
    if (!isEmpty(cells, "total") && (givenTotal === null || !near(givenTotal, total))) {
        issues.push({ column: "total", code: IMPORT_ISSUES.totalMismatch });
    }
    return issues.length > 0
        ? { draft: null, issues }
        : { draft: { ...rest, line, withholding }, issues };
};
