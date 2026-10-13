"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

export type DateFormat = (iso: string) => string;

const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

/** Date and time in the interface language, as in a list column. */
export function useDateTimeFormat(): DateFormat {
    const locale = useLocale();
    return useMemo(() => {
        const formatter = new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
        });
        return (iso: string) => formatter.format(new Date(iso));
    }, [locale]);
}

/** Compact, as on a kanban card: the time for today, the day and month otherwise. */
export function useCompactDateFormat(): DateFormat {
    const locale = useLocale();
    return useMemo(() => {
        const time = new Intl.DateTimeFormat(locale, { timeStyle: "short" });
        const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
        const full = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
        return (iso: string) => {
            const date = new Date(iso);
            const now = new Date();
            if (isSameDay(date, now)) return time.format(date);
            return date.getFullYear() === now.getFullYear() ? day.format(date) : full.format(date);
        };
    }, [locale]);
}
