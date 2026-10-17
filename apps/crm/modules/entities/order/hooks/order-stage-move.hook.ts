"use client";

import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";

import { moveOrderToStage } from "../api/order.api";
import type { MovableOrder, OrderDetail, OrderStage } from "../model/order.types";
import { applyOptimisticMove } from "../model/order-cache";
import { orderKeys } from "../model/order-keys";

export interface MoveOrderStageInput {
    order: MovableOrder;
    target: OrderStage;
    /** The card it goes under in the target column; `null` — the top */
    afterId?: string | null;
}

interface MoveContext {
    snapshot: ReadonlyArray<readonly [QueryKey, unknown]>;
}

/**
 * Moves an order to a stage optimistically: the card is already in the target column while the
 * request runs; on an error every touched cache returns to what it was.
 */
export function useMoveOrderStage() {
    const queryClient = useQueryClient();

    return useMutation<OrderDetail, Error, MoveOrderStageInput, MoveContext>({
        mutationFn: ({ order, target, afterId }) => moveOrderToStage(order.id, target.id, afterId),
        onMutate: async ({ order, target, afterId }) => {
            await queryClient.cancelQueries({ queryKey: orderKeys.all });
            const snapshot = queryClient.getQueriesData({ queryKey: orderKeys.all });
            applyOptimisticMove(queryClient, order, target, afterId ?? null);
            return { snapshot };
        },
        onError: (_error, _input, context) => {
            context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
        },
        onSuccess: (detail) => {
            queryClient.setQueryData(orderKeys.detail(detail.id), detail);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
    });
}
