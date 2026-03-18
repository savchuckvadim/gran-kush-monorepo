"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getOrderById,
    getOrders,
    type OrdersFilter,
    type OrderStatus,
    type PaymentStatus,
    updateOrderStatus,
    updatePaymentStatus,
} from "../api/order.api";

const ORDER_KEYS = {
    all: ["orders"] as const,
    list: (filters?: OrdersFilter) => [...ORDER_KEYS.all, "list", filters] as const,
    detail: (id: string) => [...ORDER_KEYS.all, "detail", id] as const,
};

export function useOrders(filters?: OrdersFilter) {
    return useQuery({
        queryKey: ORDER_KEYS.list(filters),
        queryFn: () => getOrders(filters),
    });
}

export function useOrderDetail(id: string | null) {
    return useQuery({
        queryKey: ORDER_KEYS.detail(id!),
        queryFn: () => getOrderById(id!),
        enabled: !!id,
    });
}

export function useUpdateOrderStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { status: OrderStatus } }) =>
            updateOrderStatus(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ORDER_KEYS.all });
            qc.invalidateQueries({ queryKey: ORDER_KEYS.detail(id) });
        },
    });
}

export function useUpdatePaymentStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: string;
            data: { paymentStatus: PaymentStatus; paymentMethod?: string };
        }) => updatePaymentStatus(id, data),
        onSuccess: (_, { id }) => {
            qc.invalidateQueries({ queryKey: ORDER_KEYS.all });
            qc.invalidateQueries({ queryKey: ORDER_KEYS.detail(id) });
        },
    });
}
