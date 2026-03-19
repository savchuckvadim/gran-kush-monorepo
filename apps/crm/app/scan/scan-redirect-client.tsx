"use client";

/**
 * /scan — публичная страница для QR-ссылок (Option B).
 *
 * Сценарии:
 * - Сотрудник (есть CRM-токен) -> редирект на /[locale]/crm/attendance?scan=CODE
 * - Посторонний человек (нет токена) -> редирект на NEXT_PUBLIC_MAIN_SITE_URL
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { defaultLocale, locales } from "@/i18n";
import { apiTokensStorage } from "@/modules/shared";


export function ScanRedirectClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code") ?? searchParams.get("scan");
        const requestedLocale = searchParams.get("locale") ?? undefined;

        const resolvedLocale =
            requestedLocale && locales.includes(requestedLocale as (typeof locales)[number]) ? requestedLocale : defaultLocale;

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
    }, [router, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Перенаправление...</p>
            </div>
        </div>
    );
}
