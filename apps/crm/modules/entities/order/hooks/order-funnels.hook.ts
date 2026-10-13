"use client";

import { useQuery } from "@tanstack/react-query";

import { getOrderFunnels } from "../api/order.api";
import { orderFunnelKeys } from "../model/order-keys";

const FIVE_MINUTES = 5 * 60_000;

/** Order funnels with stages; they change only in the settings. */
export function useOrderFunnels() {
    return useQuery({
        queryKey: orderFunnelKeys.all,
        queryFn: getOrderFunnels,
        staleTime: FIVE_MINUTES,
    });
}
