import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { SchemaCreateOrderDto } from "@workspace/api-client/core";

import { cabinetKeys } from "@/modules/entities/cabinet-account";

import { cancelMyOrder, getMyOrder, listMyOrders, placeMyOrder } from "../api/cabinet-order.api";

const PAGE_SIZE = 20;

const ordersKey = (slug: string) => [...cabinetKeys.club(slug), "orders"] as const;

/** Стадию двигает клуб: пока страница открыта, список и заказ перечитываются сами. */
const STAGE_POLL_MS = 30_000;

export function useMyOrders(slug: string) {
    return useInfiniteQuery({
        queryKey: [...ordersKey(slug), "list"],
        queryFn: ({ pageParam }) => listMyOrders(pageParam, PAGE_SIZE),
        initialPageParam: 1,
        getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
        refetchInterval: STAGE_POLL_MS,
        retry: false,
    });
}

export function useMyOrder(slug: string, id: string) {
    return useQuery({
        queryKey: [...ordersKey(slug), "detail", id],
        queryFn: () => getMyOrder(id),
        refetchInterval: STAGE_POLL_MS,
        retry: false,
    });
}

/** Новый заказ меняет и список заказов, и наличие на витрине. */
export function usePlaceMyOrder(slug: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            body,
            idempotencyKey,
        }: {
            body: SchemaCreateOrderDto;
            idempotencyKey: string;
        }) => placeMyOrder(body, idempotencyKey),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: cabinetKeys.club(slug) }),
    });
}

export function useCancelMyOrder(slug: string) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: cancelMyOrder,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: cabinetKeys.club(slug) }),
    });
}
