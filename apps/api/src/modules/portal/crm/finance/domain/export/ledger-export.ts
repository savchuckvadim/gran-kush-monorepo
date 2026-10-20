import { LedgerDirection } from "@prisma/client";

import { IMPORT_COLUMNS } from "../import/import-columns";
import type { Cell } from "../import/import-values";
import { categoryLabel, type FinanceCategory } from "../ledger/finance-category";
import { monthKey, monthOf, quarterOf } from "../ledger/finance-period";
import type { LedgerEntry } from "../ledger/ledger-entry";
import { fromCents } from "../ledger/ledger-money";

import {
    ACCOUNT_MEANS,
    ACCOUNT_WORDS,
    DIRECTION_WORDS,
    qualificationOf,
    rateWord,
    SOURCE_WORDS,
    STATUS_WORDS,
    SYSTEM_AUTHOR,
} from "./export-labels";

/** Справочники выгрузки: статьи, контрагенты (имя и номер), авторы проводок. */
export interface ExportContext {
    categories: ReadonlyMap<string, FinanceCategory>;
    counterparties: ReadonlyMap<string, { name: string; nif: string | null }>;
    authors: ReadonlyMap<string, string>;
}

export const ENTRY_EXPORT_HEADER: readonly string[] = [
    ...IMPORT_COLUMNS,
    "estado",
    "origen",
    "periodo",
    "id",
    "creado_por",
];

/** Строка на ставку; удержание — у первой строки, у неё же итог за вычетом IRPF. */
const linesOf = (entry: LedgerEntry) =>
    entry.secret.lines.map((line, index) => {
        const withholding = index === 0 ? entry.secret.withholding : null;
        return { line, withholding, total: line.net + line.tax - (withholding?.amount ?? 0) };
    });

const conceptOf = (entry: LedgerEntry, context: ExportContext): string => {
    if (entry.secret.description) return entry.secret.description;
    if (entry.direction === LedgerDirection.transfer) {
        const to = entry.toAccount ? ACCOUNT_WORDS[entry.toAccount] : "";
        return `Traspaso ${ACCOUNT_WORDS[entry.account]} a ${to}`.trim();
    }
    const category = entry.categoryId ? context.categories.get(entry.categoryId) : undefined;
    const order = entry.secret.sourceLabel ? `Pedido ${entry.secret.sourceLabel}` : null;
    return [category ? categoryLabel(category) : null, order].filter(Boolean).join(" · ");
};

const partyOf = (entry: LedgerEntry, context: ExportContext) =>
    (entry.counterpartyId ? context.counterparties.get(entry.counterpartyId) : undefined) ?? {
        name: "",
        nif: null,
    };

/** Выгрузка проводок: колонки шаблона импорта и служебные — её можно загрузить обратно. */
export const entryExportRows = (
    entries: readonly LedgerEntry[],
    context: ExportContext
): Cell[][] =>
    entries.flatMap((entry) => {
        const party = partyOf(entry, context);
        const category = entry.categoryId ? context.categories.get(entry.categoryId) : undefined;
        return linesOf(entry).map(({ line, withholding, total }) => [
            DIRECTION_WORDS[entry.direction],
            entry.occurredOn,
            category?.code ?? "",
            conceptOf(entry, context),
            party.name,
            party.nif ?? "",
            entry.secret.documentNumber ?? "",
            fromCents(line.net),
            rateWord(line.percent, line.treatment),
            fromCents(line.tax),
            withholding ? withholding.percent : "",
            withholding ? fromCents(withholding.amount) : "",
            fromCents(total),
            ACCOUNT_WORDS[entry.account],
            entry.secret.paidOn ?? "",
            entry.secret.notes ?? "",
            STATUS_WORDS[entry.status],
            SOURCE_WORDS[entry.sourceType],
            monthKey(monthOf(entry.occurredOn)),
            entry.id,
            (entry.createdById ? context.authors.get(entry.createdById) : undefined) ??
                SYSTEM_AUTHOR,
        ]);
    });

/** Книги по Orden HAC/773/2019: расходы (art. 3.1) и доходы (art. 2.1) autónomo. */
export type LedgerBook = "purchases" | "sales";

export const BOOK_HEADERS: Record<LedgerBook, readonly string[]> = {
    purchases: [
        "Ejercicio",
        "Periodo",
        "Número de recepción",
        "Fecha expedición",
        "Fecha operación",
        "Serie y número",
        "NIF expedidor",
        "Nombre expedidor",
        "Concepto",
        "Calificación",
        "Base imponible",
        "Tipo IVA %",
        "Cuota IVA",
        "Tipo retención %",
        "Retención IRPF",
        "Total",
        "Fecha pago",
        "Medio de pago",
    ],
    sales: [
        "Ejercicio",
        "Periodo",
        "Fecha expedición",
        "Fecha operación",
        "Serie y número",
        "NIF destinatario",
        "Nombre destinatario",
        "Concepto",
        "Calificación",
        "Base imponible",
        "Tipo IVA %",
        "Cuota IVA",
        "Tipo retención %",
        "Retención IRPF",
        "Total",
        "Fecha cobro",
        "Medio de cobro",
    ],
};

export const BOOK_DIRECTION: Record<LedgerBook, LedgerDirection> = {
    purchases: LedgerDirection.expense,
    sales: LedgerDirection.income,
};

/**
 * Номер приёма расхода без фактуры (art. 3.1 Orden): порядковый в году, по дате операции.
 * Считается по всем расходам года, а не по выгрузке — номер не меняется от выбранного периода.
 */
export const receptionNumbers = (yearExpenses: readonly LedgerEntry[]): Map<string, string> => {
    const counters = new Map<string, number>();
    const numbers = new Map<string, string>();
    for (const entry of yearExpenses) {
        const year = entry.occurredOn.slice(0, 4);
        const next = (counters.get(year) ?? 0) + 1;
        counters.set(year, next);
        numbers.set(entry.id, `${year}-${String(next).padStart(4, "0")}`);
    }
    return numbers;
};

/** Строки книги: по строке на ставку, суммы сторно — с минусом. */
export const bookRows = (
    book: LedgerBook,
    entries: readonly LedgerEntry[],
    context: ExportContext,
    receptions: ReadonlyMap<string, string>
): Cell[][] =>
    entries.flatMap((entry) => {
        const party = partyOf(entry, context);
        return linesOf(entry).map(({ line, withholding, total }) => [
            Number(entry.occurredOn.slice(0, 4)),
            quarterOf(entry.occurredOn),
            ...(book === "purchases" ? [receptions.get(entry.id) ?? ""] : []),
            entry.secret.documentDate ?? entry.occurredOn,
            entry.occurredOn,
            entry.secret.documentNumber ?? "",
            party.nif ?? "",
            party.name,
            conceptOf(entry, context),
            qualificationOf(line.treatment),
            fromCents(line.net),
            line.treatment === null ? "" : line.percent,
            fromCents(line.tax),
            withholding ? withholding.percent : "",
            withholding ? fromCents(withholding.amount) : "",
            fromCents(total),
            entry.secret.paidOn ?? "",
            ACCOUNT_MEANS[entry.account],
        ]);
    });
