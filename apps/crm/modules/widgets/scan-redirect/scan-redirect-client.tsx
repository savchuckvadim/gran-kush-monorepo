"use client";

/**
 * /scan — публичная страница для QR-ссылок (Option B).
 *
 * Сценарии:
 * - Сотрудник (есть CRM-токен) -> редирект на /[locale]/crm/attendance?scan=CODE
 * - Посторонний человек (нет токена) -> редирект на NEXT_PUBLIC_MAIN_SITE_URL
 */

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { defaultLocale, locales } from "@/i18n";
import { apiTokensStorage } from "@/modules/shared";


export function ScanRedirectClient() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code") ?? searchParams.get("scan");
        const requestedLocale = searchParams.get("locale") ?? undefined;
        const localeFromPath = pathname.split("/")[1];
        const pathLocale =
            localeFromPath && locales.includes(localeFromPath as (typeof locales)[number]) ? localeFromPath : undefined;

        const resolvedLocale = pathLocale ?? (requestedLocale && locales.includes(requestedLocale as (typeof locales)[number])
            ? requestedLocale
            : defaultLocale);

        // Canonical route for QR flow is /{locale}/scan.
        // If someone opens legacy /scan, normalize URL first.
        if (!pathLocale) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("locale");
            const query = params.toString();
            router.replace(`/${resolvedLocale}/scan${query ? `?${query}` : ""}`);
            return;
        }

        const hasCrmToken = typeof window !== "undefined" && !!apiTokensStorage.getAccessToken();

        if (!hasCrmToken) {
            const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://google.com";
            window.location.replace(mainSiteUrl);
            return;
        }

        const attendancePath = `/${resolvedLocale}/crm/attendance`;
        if (!code) {
            router.replace(attendancePath);
            return;
        }

        router.replace(`${attendancePath}?scan=${encodeURIComponent(code)}`);
    }, [pathname, router, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Перенаправление...</p>
            </div>
        </div>
    );
}
