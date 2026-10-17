"use client";

import { useInfiniteQuery } from "@tanstack/react-query";

import { getOrders } from "../api/order.api";
import type { OrdersFilter } from "../model/order.types";
import { orderKeys } from "../model/order-keys";

const COLUMN_PAGE_SIZE = 20;

/** The orders of one kanban column in the order of its cards, loaded 20 at a time as it scrolls. */
export function useOrderStageColumn(stageId: string, filter: OrdersFilter) {
    return useInfiniteQuery({
        queryKey: orderKeys.column(stageId, filter),
        queryFn: ({ pageParam }) =>
            getOrders({
                ...filter,
                stageId,
                sortBy: "stagePosition",
                page: pageParam,
                limit: COLUMN_PAGE_SIZE,
            }),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
    });
}
