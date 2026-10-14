"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 30.44;

const unit = (locale: string, name: "minute" | "hour" | "day" | "month" | "year", long = false) =>
    new Intl.NumberFormat(locale, {
        style: "unit",
        unit: name,
        unitDisplay: long ? "long" : "short",
        maximumFractionDigits: name === "year" ? 1 : 0,
    });

/** A visit's length: «2 ч 10 мин», «45 мин». */
export function useDurationFormat(): (minutes: number) => string {
    const locale = useLocale();
    return useMemo(() => {
        const hours = unit(locale, "hour");
        const mins = unit(locale, "minute");
        return (minutes: number) => {
            const total = Math.max(0, Math.round(minutes));
            const h = Math.floor(total / 60);
            const m = total % 60;
            if (h === 0) return mins.format(m);
            return m === 0 ? hours.format(h) : `${hours.format(h)} ${mins.format(m)}`;
        };
    }, [locale]);
}

/** How long someone has been here: «12 дн.», «8 мес.», «1,5 г.». */
export function useTenureFormat(): (sinceIso: string) => string {
    const locale = useLocale();
    return useMemo(() => {
        const days = unit(locale, "day");
        const months = unit(locale, "month");
        const years = unit(locale, "year");
        return (sinceIso: string) => {
            const elapsed = Math.max(0, (Date.now() - new Date(sinceIso).getTime()) / DAY_MS);
            if (elapsed < MONTH_DAYS) return days.format(Math.floor(elapsed));
            const inMonths = elapsed / MONTH_DAYS;
            return inMonths < 12
                ? months.format(Math.floor(inMonths))
                : years.format(inMonths / 12);
        };
    }, [locale]);
}

/** Full years since a birthday, in words: «34 года». */
export function useAgeFormat(): (birthdayIso: string) => string {
    const locale = useLocale();
    return useMemo(() => {
        const years = new Intl.NumberFormat(locale, {
            style: "unit",
            unit: "year",
            unitDisplay: "long",
        });
        return (birthdayIso: string) => {
            const birthday = new Date(birthdayIso);
            const now = new Date();
            let age = now.getFullYear() - birthday.getFullYear();
            const beforeBirthday =
                now.getMonth() < birthday.getMonth() ||
                (now.getMonth() === birthday.getMonth() && now.getDate() < birthday.getDate());
            if (beforeBirthday) age -= 1;
            return years.format(Math.max(0, age));
        };
    }, [locale]);
}
