"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { updatePaymentStatus } from "../api/order.api";
import type { PaymentStatus } from "../model/order.types";
import { orderKeys } from "../model/order-keys";

export interface UpdatePaymentInput {
    id: string;
    paymentStatus: PaymentStatus;
    paymentMethod?: string;
}

export function useUpdatePaymentStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...body }: UpdatePaymentInput) => updatePaymentStatus(id, body),
        onSuccess: (detail) => {
            queryClient.setQueryData(orderKeys.detail(detail.id), detail);
            void queryClient.invalidateQueries({ queryKey: orderKeys.all });
        },
    });
}
