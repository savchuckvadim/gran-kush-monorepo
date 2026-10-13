"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getOrders } from "../api/order.api";
import type { OrdersListParams } from "../model/order.types";
import { orderKeys } from "../model/order-keys";

/** A page of the orders list. */
export function useOrders(params: OrdersListParams) {
    return useQuery({
        queryKey: orderKeys.list(params),
        queryFn: () => getOrders(params),
        placeholderData: keepPreviousData,
    });
}
