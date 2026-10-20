"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    archiveTaxRate,
    createTaxRate,
    getTaxRates,
    makeDefaultTaxRate,
    type TaxRate,
    type TaxRateChange,
    updateTaxRate,
} from "../api/tax-rates.api";
import { taxRateKeys } from "../model/tax-rate-keys";

/** Ставки клуба; `enabled` — только при включённом модуле финансов (иначе API ответит 403). */
export function useTaxRates({
    enabled = true,
    includeArchived = false,
}: { enabled?: boolean; includeArchived?: boolean } = {}) {
    return useQuery({
        queryKey: taxRateKeys.list(includeArchived),
        queryFn: () => getTaxRates(includeArchived),
        enabled,
    });
}

/** Любая правка ставок меняет и цены «налог сверху»: перечитываем все списки ставок. */
const useTaxRateMutation = <A>(mutationFn: (args: A) => Promise<unknown>) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: taxRateKeys.all }),
    });
};

export const useCreateTaxRate = () => useTaxRateMutation(createTaxRate);

export const useUpdateTaxRate = () =>
    useTaxRateMutation(({ id, change }: { id: string; change: TaxRateChange }) =>
        updateTaxRate(id, change)
    );

export const useMakeDefaultTaxRate = () => useTaxRateMutation(makeDefaultTaxRate);

export const useArchiveTaxRate = () => useTaxRateMutation(archiveTaxRate);

/** Подпись ставки: своё имя, иначе перевод пресета по коду («IVA general 21 %»). */
export function useTaxRateLabel(): (
    rate: Pick<TaxRate, "name" | "presetCode" | "percent">
) => string {
    const t = useTranslations("crm.finance.taxRates.presets");
    return useCallback(
        (rate) => rate.name ?? (rate.presetCode ? t(rate.presetCode) : `${rate.percent} %`),
        [t]
    );
}
