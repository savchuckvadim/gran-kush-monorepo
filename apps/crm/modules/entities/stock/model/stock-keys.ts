import type { PurchasesFilter, StockMovesFilter } from "../api/stock.api";

/** Остатки, журнал, поставки и маржа: любое движение склада меняет их все. */
export const stockKeys = {
    all: ["stock"] as const,
    state: (productId: string) => [...stockKeys.all, "state", productId] as const,
    moves: (filter: StockMovesFilter) => [...stockKeys.all, "moves", filter] as const,
    purchases: (filter: PurchasesFilter) => [...stockKeys.all, "purchases", filter] as const,
    margin: (range: { from: string; to: string }) => [...stockKeys.all, "margin", range] as const,
};
