import type { InfiniteData, QueryClient } from "@tanstack/react-query";

import type {
    MovableOrder,
    OrderDetail,
    OrderListItem,
    OrderPage,
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

const withoutOrder = (data: ColumnData, orderId: string): ColumnData => ({
    ...data,
    pages: data.pages.map((page) => {
        const items = page.items.filter((item) => item.id !== orderId);
        return items.length === page.items.length
            ? page
            : { ...page, items, total: Math.max(0, page.total - 1) };
    }),
});

const withOrderOnTop = (data: ColumnData, order: OrderListItem): ColumnData => {
    const [first, ...rest] = data.pages;
    if (!first) return data;
    return {
        ...data,
        pages: [{ ...first, items: [order, ...first.items], total: first.total + 1 }, ...rest],
    };
};

/**
 * Shows a move before the server confirms it: the card leaves every column and lands on top of
 * the target column, the column totals shift, the open card shows the new stage.
 */
export function applyOptimisticMove(
    queryClient: QueryClient,
    order: MovableOrder,
    target: OrderStage
): void {
    const known = findOrderInColumns(queryClient, order.id);

    for (const [key, data] of columnQueries(queryClient)) {
        if (!data) continue;
        const next = withoutOrder(data, order.id);
        const isTarget = key[COLUMN_KEY_STAGE_INDEX] === target.id;
        queryClient.setQueryData<ColumnData>(
            key,
            isTarget && known ? withOrderOnTop(next, { ...known, stage: target }) : next
        );
    }

    const fromId = order.stage?.id ?? null;
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
