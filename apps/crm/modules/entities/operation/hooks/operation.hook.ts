"use client";

import { useQuery } from "@tanstack/react-query";

import { getOperation, isOperationSettled } from "../api/operations.api";
import { OPERATION_POLL_MS, operationKeys } from "../model/operation-keys";

/**
 * Фоновая операция по id из ответа 202. Пока она идёт, запрос повторяется по таймеру — страховка
 * на случай потерянного сокета; итог приносит realtime-правило сущности.
 */
export function useOperation(id: string | null) {
    return useQuery({
        queryKey: operationKeys.one(id ?? ""),
        queryFn: () => getOperation(id as string),
        enabled: id !== null,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && isOperationSettled(status) ? false : OPERATION_POLL_MS;
        },
    });
}
