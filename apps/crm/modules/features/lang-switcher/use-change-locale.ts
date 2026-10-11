"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { type Locale, locales } from "@/modules/shared/config/i18n";

const isLocale = (value: string): value is Locale => locales.some((locale) => locale === value);

/** Текущий язык и переход на тот же адрес в другом языке. */
export function useChangeLocale() {
    const current = useLocale();
    const locale: Locale = isLocale(current) ? current : locales[0];
    const router = useRouter();
    const pathname = usePathname();

    const changeLocale = (next: string) => {
        if (next === locale || !isLocale(next)) {
            return;
        }
        const segments = pathname.split("/");
        if (segments[1] && isLocale(segments[1])) {
            segments[1] = next;
        } else {
            segments.splice(1, 0, next);
        }
        router.replace(segments.join("/"));
    };

    return { locale, changeLocale };
}
