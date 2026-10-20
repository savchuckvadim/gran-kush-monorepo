import type { LedgerFilter } from "../api/ledger.api";

/** Реестр, обзор и месяцы: всё, что меняет проводка, — под одним корнем. */
export const ledgerKeys = {
    all: ["ledger"] as const,
    entries: (filter: LedgerFilter) => [...ledgerKeys.all, "entries", filter] as const,
    entry: (id: string) => [...ledgerKeys.all, "entry", id] as const,
    overview: (range: { from: string; to: string }) =>
        [...ledgerKeys.all, "overview", range] as const,
    periods: () => [...ledgerKeys.all, "periods"] as const,
};

export const financeCategoryKeys = {
    all: ["finance-categories"] as const,
    list: (includeArchived: boolean) => [...financeCategoryKeys.all, { includeArchived }] as const,
};

export const counterpartyKeys = {
    all: ["counterparties"] as const,
    list: (includeArchived: boolean) => [...counterpartyKeys.all, { includeArchived }] as const,
};
