"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getOrderStageSummary } from "../api/order.api";
import type { OrdersFilter } from "../model/order.types";
import { orderKeys } from "../model/order-keys";

/** Count and total per stage of a funnel — the kanban column headers. */
export function useOrderStageSummary(funnelId: string | undefined, filter: OrdersFilter) {
    return useQuery({
        queryKey: orderKeys.summary(funnelId ?? "", filter),
        queryFn: () => getOrderStageSummary(funnelId ?? "", filter),
        enabled: Boolean(funnelId),
        placeholderData: keepPreviousData,
    });
}
