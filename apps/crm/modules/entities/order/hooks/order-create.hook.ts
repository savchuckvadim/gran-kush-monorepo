"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createOrder } from "../api/order.api";
import { orderKeys } from "../model/order-keys";

export function useCreateOrder() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createOrder,
        onSuccess: (detail) => {
            queryClient.setQueryData(orderKeys.detail(detail.id), detail);
            void queryClient.invalidateQueries({ queryKey: orderKeys.all });
        },
    });
}
