"use client";

import { useCallback } from "react";
import { useFormatter, useTranslations } from "next-intl";

type PricedItem = { priceAmount: string; currency: string; interval: string };

const isKnownInterval = (value: string): value is "month" | "year" =>
    value === "month" || value === "year";

export const useBillingFormat = () => {
    const format = useFormatter();
    const t = useTranslations("billing.interval");

    const money = useCallback(
        (amount: string, currency: string): string => {
            const value = Number(amount);
            if (!Number.isFinite(value)) return `${amount} ${currency}`;
            try {
                return format.number(value, { style: "currency", currency });
            } catch {
                return `${amount} ${currency}`;
            }
        },
        [format]
    );

    const date = useCallback(
        (iso: string | null): string | null =>
            iso ? format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" }) : null,
        [format]
    );

    const price = useCallback(
        (item: PricedItem): string => {
            const period = isKnownInterval(item.interval) ? t(item.interval) : item.interval;
            return `${money(item.priceAmount, item.currency)} / ${period}`;
        },
        [money, t]
    );

    return { money, date, price };
};
