"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";

import { ledgerKeys } from "@/modules/entities/finance";
import { PRODUCT_KEYS } from "@/modules/entities/product";

import {
    getMarginReport,
    getPurchases,
    getStockMoves,
    getStockState,
    isStockErrorCode,
    moveStock,
    type PurchasesFilter,
    receivePurchase,
    type StockMovesFilter,
} from "../api/stock.api";
import { stockKeys } from "../model/stock-keys";

export function useStockState(productId: string | null) {
    return useQuery({
        queryKey: stockKeys.state(productId ?? ""),
        queryFn: () => getStockState(productId ?? ""),
        enabled: Boolean(productId),
    });
}

export function useStockMoves(filter: StockMovesFilter, enabled = true) {
    return useQuery({
        queryKey: stockKeys.moves(filter),
        queryFn: () => getStockMoves(filter),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function usePurchases(filter: PurchasesFilter, enabled = true) {
    return useQuery({
        queryKey: stockKeys.purchases(filter),
        queryFn: () => getPurchases(filter),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useMarginReport(range: { from: string; to: string }, enabled = true) {
    return useQuery({
        queryKey: stockKeys.margin(range),
        queryFn: () => getMarginReport(range),
        placeholderData: keepPreviousData,
        enabled,
    });
}

/** Движение склада меняет остатки в каталоге, журнал и реестр (поставка — расход). */
const useStockMutation = <A, R>(mutationFn: (args: A) => Promise<R>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: stockKeys.all }),
                queryClient.invalidateQueries({ queryKey: PRODUCT_KEYS.all }),
                queryClient.invalidateQueries({ queryKey: ledgerKeys.all }),
            ]);
        },
    });
};

export const useReceivePurchase = () => useStockMutation(receivePurchase);

export const useMoveStock = () => useStockMutation(moveStock);

/** Текст отказа API склада: известный код — переводом, остальное — сообщением API. */
export function useStockErrorText(): (error: unknown) => string {
    const t = useTranslations("crm.stock.errors");
    return useCallback(
        (error: unknown) => {
            const code = getApiErrorCode(error);
            return isStockErrorCode(code) ? t(code) : getApiErrorMessage(error);
        },
        [t]
    );
}
