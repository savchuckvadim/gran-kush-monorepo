import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type {
    MovableOrder,
    OrderDetail,
    OrderListItem,
    OrderPage,
    OrdersFilter,
    OrderStage,
    OrderStageSummary,
} from "./order.types";
import { COLUMN_KEY_STAGE_INDEX, orderKeys } from "./order-keys";

/** The cached pages of one kanban column. */
export type ColumnData = InfiniteData<OrderPage, number>;

const columnQueries = (queryClient: QueryClient) =>
    queryClient.getQueriesData<ColumnData>({ queryKey: orderKeys.columns() });

/** An order as a loaded kanban column shows it — for the drag overlay and the move itself. */
export function findOrderInColumns(
    queryClient: QueryClient,
    orderId: string
): OrderListItem | undefined {
    for (const [, data] of columnQueries(queryClient)) {
        for (const page of data?.pages ?? []) {
            const order = page.items.find((item) => item.id === orderId);
            if (order) return order;
        }
    }
    return undefined;
}

/** The ids of a loaded kanban column in its order — to name the card a dropped one goes under. */
export function columnOrderIds(
    queryClient: QueryClient,
    stageId: string,
    filter: OrdersFilter
): string[] {
    const data = queryClient.getQueryData<ColumnData>(orderKeys.column(stageId, filter));
    return data?.pages.flatMap((page) => page.items.map((item) => item.id)) ?? [];
}

const withoutOrder = (data: ColumnData, orderId: string): ColumnData => ({
    ...data,
    pages: data.pages.map((page) => {
        const items = page.items.filter((item) => item.id !== orderId);
        return items.length === page.items.length
            ? page
            : { ...page, items, total: Math.max(0, page.total - 1) };
    }),
});

/** Puts the order right under `afterId`; not loaded or `null` — on top of the column. */
const withOrderAfter = (
    data: ColumnData,
    order: OrderListItem,
    afterId: string | null
): ColumnData => {
    const pageIndex = afterId
        ? data.pages.findIndex((page) => page.items.some((item) => item.id === afterId))
        : -1;
    if (pageIndex >= 0) {
        return {
            ...data,
            pages: data.pages.map((page, index) => {
                if (index !== pageIndex) return page;
                const at = page.items.findIndex((item) => item.id === afterId) + 1;
                const items = [...page.items.slice(0, at), order, ...page.items.slice(at)];
                return { ...page, items, total: page.total + 1 };
            }),
        };
    }
    const [first, ...rest] = data.pages;
    if (!first) return data;
    return {
        ...data,
        pages: [{ ...first, items: [order, ...first.items], total: first.total + 1 }, ...rest],
    };
};

/**
 * Shows a move before the server confirms it: the card leaves every column and lands in the
 * target column under `afterId` (on top without it), the column totals shift, the open card shows
 * the new stage. Within one column it is a reorder, and the totals stay.
 */
export function applyOptimisticMove(
    queryClient: QueryClient,
    order: MovableOrder,
    target: OrderStage,
    afterId: string | null = null
): void {
    const known = findOrderInColumns(queryClient, order.id);

    for (const [key, data] of columnQueries(queryClient)) {
        if (!data) continue;
        const next = withoutOrder(data, order.id);
        const isTarget = key[COLUMN_KEY_STAGE_INDEX] === target.id;
        queryClient.setQueryData<ColumnData>(
            key,
            isTarget && known ? withOrderAfter(next, { ...known, stage: target }, afterId) : next
        );
    }

    const fromId = order.stage?.id ?? null;
    if (fromId === target.id) return;
    queryClient.setQueriesData<OrderStageSummary>({ queryKey: orderKeys.summaries() }, (data) =>
        data
            ? {
                  stages: data.stages.map((item) => {
                      if (item.stageId === fromId) {
                          return {
                              ...item,
                              count: item.count - 1,
                              total: item.total - order.total,
                          };
                      }
                      if (item.stageId === target.id) {
                          return {
                              ...item,
                              count: item.count + 1,
                              total: item.total + order.total,
                          };
                      }
                      return item;
                  }),
              }
            : data
    );

    queryClient.setQueryData<OrderDetail>(orderKeys.detail(order.id), (detail) =>
        detail ? { ...detail, stage: target } : detail
    );
}
