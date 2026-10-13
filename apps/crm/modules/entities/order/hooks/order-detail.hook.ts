"use client";

import { useQuery } from "@tanstack/react-query";

import { getOrderById } from "../api/order.api";
import { orderKeys } from "../model/order-keys";

export function useOrderDetail(id: string) {
    return useQuery({
        queryKey: orderKeys.detail(id),
        queryFn: () => getOrderById(id),
        enabled: id.length > 0,
    });
}
