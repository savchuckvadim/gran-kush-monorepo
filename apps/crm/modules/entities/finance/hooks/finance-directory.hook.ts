"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    archiveCounterparty,
    archiveFinanceCategory,
    closeFinancePeriod,
    type CounterpartyInput,
    createCounterparty,
    createFinanceCategory,
    type FinanceCategory,
    type FinanceCategoryChange,
    getCounterparties,
    getFinanceCategories,
    getFinancePeriods,
    reopenFinancePeriod,
    updateCounterparty,
    updateFinanceCategory,
} from "../api/finance-directory.api";
import { counterpartyKeys, financeCategoryKeys, ledgerKeys } from "../model/ledger-keys";

export function useFinanceCategories({
    enabled = true,
    includeArchived = false,
}: { enabled?: boolean; includeArchived?: boolean } = {}) {
    return useQuery({
        queryKey: financeCategoryKeys.list(includeArchived),
        queryFn: () => getFinanceCategories(includeArchived),
        enabled,
    });
}

const useInvalidating = <A, R>(
    mutationFn: (args: A) => Promise<R>,
    roots: readonly (readonly string[])[]
) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () =>
            Promise.all(roots.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
    });
};

export const useCreateFinanceCategory = () =>
    useInvalidating(createFinanceCategory, [financeCategoryKeys.all]);

export const useUpdateFinanceCategory = () =>
    useInvalidating(
        ({ id, change }: { id: string; change: FinanceCategoryChange }) =>
            updateFinanceCategory(id, change),
        [financeCategoryKeys.all]
    );

export const useArchiveFinanceCategory = () =>
    useInvalidating(archiveFinanceCategory, [financeCategoryKeys.all]);

/** Подпись статьи: своё название, иначе перевод пресета по коду («Аренда»). */
export function useFinanceCategoryLabel(): (
    category: Pick<FinanceCategory, "name" | "code">
) => string {
    const t = useTranslations("crm.finance.categories.presets");
    return useCallback(
        (category) => category.name ?? (t.has(category.code) ? t(category.code) : category.code),
        [t]
    );
}

export function useCounterparties({
    enabled = true,
    includeArchived = false,
}: { enabled?: boolean; includeArchived?: boolean } = {}) {
    return useQuery({
        queryKey: counterpartyKeys.list(includeArchived),
        queryFn: () => getCounterparties(includeArchived),
        enabled,
    });
}

export const useCreateCounterparty = () =>
    useInvalidating(createCounterparty, [counterpartyKeys.all]);

export const useUpdateCounterparty = () =>
    useInvalidating(
        ({ id, input }: { id: string; input: CounterpartyInput }) => updateCounterparty(id, input),
        [counterpartyKeys.all, ledgerKeys.all]
    );

export const useArchiveCounterparty = () =>
    useInvalidating(archiveCounterparty, [counterpartyKeys.all]);

export function useFinancePeriods() {
    return useQuery({ queryKey: ledgerKeys.periods(), queryFn: getFinancePeriods });
}

/** Закрытие меняет, что можно править в реестре: перечитываем и месяцы, и проводки. */
export const useCloseFinancePeriod = () => useInvalidating(closeFinancePeriod, [ledgerKeys.all]);

export const useReopenFinancePeriod = () => useInvalidating(reopenFinancePeriod, [ledgerKeys.all]);
