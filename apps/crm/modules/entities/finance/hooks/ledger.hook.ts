"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    cancelLedgerEntry,
    correctLedgerEntry,
    createLedgerEntry,
    getFinanceOverview,
    getLedgerEntries,
    getLedgerEntry,
    type LedgerEntryClassification,
    type LedgerEntryInput,
    type LedgerFilter,
    reclassifyLedgerEntry,
} from "../api/ledger.api";
import { counterpartyKeys, ledgerKeys } from "../model/ledger-keys";

export function useLedgerEntries(filter: LedgerFilter, enabled = true) {
    return useQuery({
        queryKey: ledgerKeys.entries(filter),
        queryFn: () => getLedgerEntries(filter),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useLedgerEntry(id: string | null) {
    return useQuery({
        queryKey: ledgerKeys.entry(id ?? ""),
        queryFn: () => getLedgerEntry(id ?? ""),
        enabled: Boolean(id),
    });
}

export function useFinanceOverview(range: { from: string; to: string }) {
    return useQuery({
        queryKey: ledgerKeys.overview(range),
        queryFn: () => getFinanceOverview(range),
        placeholderData: keepPreviousData,
    });
}

/** Проводка меняет реестр, обзор, месяцы и счётчики контрагентов — перечитываем всё сразу. */
export const useLedgerMutation = <A, R>(mutationFn: (args: A) => Promise<R>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ledgerKeys.all }),
                queryClient.invalidateQueries({ queryKey: counterpartyKeys.all }),
            ]);
        },
    });
};

export const useCreateLedgerEntry = () => useLedgerMutation(createLedgerEntry);

export const useCorrectLedgerEntry = () =>
    useLedgerMutation(({ id, input }: { id: string; input: LedgerEntryInput }) =>
        correctLedgerEntry(id, input)
    );

export const useReclassifyLedgerEntry = () =>
    useLedgerMutation(({ id, change }: { id: string; change: LedgerEntryClassification }) =>
        reclassifyLedgerEntry(id, change)
    );

export const useCancelLedgerEntry = () => useLedgerMutation(cancelLedgerEntry);
