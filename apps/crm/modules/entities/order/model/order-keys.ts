import type { OrdersFilter, OrdersListParams } from "./order.types";

/**
 * Query keys of orders. Everything an order change touches lives under `all`, so one
 * invalidation refreshes the list, the kanban columns, their totals and the card.
 */
export const orderKeys = {
    all: ["orders"] as const,
    lists: () => [...orderKeys.all, "list"] as const,
    list: (params: OrdersListParams) => [...orderKeys.lists(), params] as const,
    columns: () => [...orderKeys.all, "column"] as const,
    column: (stageId: string, filter: OrdersFilter) =>
        [...orderKeys.columns(), stageId, filter] as const,
    summaries: () => [...orderKeys.all, "summary"] as const,
    summary: (funnelId: string, filter: OrdersFilter) =>
        [...orderKeys.summaries(), funnelId, filter] as const,
    details: () => [...orderKeys.all, "detail"] as const,
    detail: (id: string) => [...orderKeys.details(), id] as const,
};

/** Funnels change only in the settings: kept apart, so moving an order does not refetch them. */
export const orderFunnelKeys = {
    all: ["order-funnels"] as const,
};

/** Index of the stage id in a {@link orderKeys.column} key. */
export const COLUMN_KEY_STAGE_INDEX = 2;
