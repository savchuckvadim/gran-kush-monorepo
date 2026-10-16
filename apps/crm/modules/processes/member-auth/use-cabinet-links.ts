"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";

/**
 * Видимые адреса кабинета на club.paf-paf.app. Внутренний префикс дерева (`/m`) в них не
 * появляется: прокси переписывает адрес на сервере (см. `club-routes.ts`).
 */
export function useCabinetLinks() {
    const locale = useLocale();

    return useMemo(
        () => ({
            home: `/${locale}`,
            clubs: `/${locale}/me/clubs`,
            passport: `/${locale}/me/passport`,
            club: (slug: string) => `/${locale}/${slug}`,
            clubShop: (slug: string) => `/${locale}/${slug}/shop`,
            clubOrders: (slug: string) => `/${locale}/${slug}/orders`,
            clubOrder: (slug: string, orderId: string) => `/${locale}/${slug}/orders/${orderId}`,
            login: `/${locale}/auth/login`,
            register: `/${locale}/auth/register`,
            forgotPassword: `/${locale}/auth/forgot-password`,
            join: (token: string) => `/${locale}/join/${token}`,
        }),
        [locale]
    );
}

/** Куда вернуть после входа: только путь на нашем сайте, без хоста и схемы. */
export const safeReturnPath = (raw: string | null | undefined, fallback: string): string => {
    if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
        return fallback;
    }
    return raw;
};
