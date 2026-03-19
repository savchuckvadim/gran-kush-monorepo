"use client";

/**
 * /scan — публичная страница для QR-ссылок (Option B).
 *
 * Сценарии:
 * - Сотрудник (есть CRM-токен) → редирект на /[locale]/crm/attendance?scan=CODE
 * - Посторонний человек (нет токена) → редирект на NEXT_PUBLIC_MAIN_SITE_URL
 *
 * Пример QR-значения (Option B):
 *   https://crm.example.com/scan?code=IV_HEX:AUTHTAG_HEX:CIPHERTEXT_HEX
 */

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

const CRM_TOKEN_KEY = "access_token_crm";
const DEFAULT_LOCALE = "ru";

export default function ScanRedirectPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code");

        // Проверяем наличие CRM-токена в localStorage
        const hasCrmToken =
            typeof window !== "undefined" &&
            !!localStorage.getItem(CRM_TOKEN_KEY);

        if (!hasCrmToken) {
            // Не сотрудник — уходим на основной сайт
            const mainSiteUrl =
                process.env.NEXT_PUBLIC_MAIN_SITE_URL || "https://google.com";
            window.location.replace(mainSiteUrl);
            return;
        }

        // Сотрудник — направляем в CRM с предзаполненным кодом
        const attendancePath = `/${DEFAULT_LOCALE}/crm/attendance`;
        if (code) {
            router.replace(`${attendancePath}?scan=${encodeURIComponent(code)}`);
        } else {
            router.replace(attendancePath);
        }
    }, [router, searchParams]);

    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Перенаправление…</p>
            </div>
        </div>
    );
}
