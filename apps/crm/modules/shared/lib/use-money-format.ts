"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

export type MoneyFormat = (amount: number) => string;

/** Amounts in the interface language: «1 234,50 €» in Spanish and Russian, «€1,234.50» in English. */
export function useMoneyFormat(currency = "EUR"): MoneyFormat {
    const locale = useLocale();
    return useMemo(() => {
        const formatter = new Intl.NumberFormat(locale, {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        });
        return (amount: number) => formatter.format(amount);
    }, [locale, currency]);
}
