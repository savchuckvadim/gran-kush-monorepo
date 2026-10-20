"use client";

/**
 * /scan — публичная страница для QR-ссылок (Option B).
 *
 * Сценарии:
 * - Код участника -> /[locale]/[portal]/crm/attendance?scan=CODE (стойка)
 * - Этикетка товара (`P-…`) -> /[locale]/[portal]/crm/product/list?scanCode=CODE (общий сканер)
 * - Дальше protected-route auth guard сам решает: пускать в CRM или отправлять на login
 */

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Loader2 } from "lucide-react";

import { defaultLocale, locales } from "@/i18n";
import { isProductLabelCode, SCAN_CODE_PARAM } from "@/modules/entities/scan";

export function ScanRedirectClient() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const code = searchParams.get("code") ?? searchParams.get("scan");
        const requestedLocale = searchParams.get("locale") ?? undefined;
        const segments = pathname.split("/").filter(Boolean);
        const firstSegment = segments[0];
        const secondSegment = segments[1];
        const pathLocale =
            firstSegment && locales.includes(firstSegment as (typeof locales)[number])
                ? firstSegment
                : secondSegment && locales.includes(secondSegment as (typeof locales)[number])
                  ? secondSegment
                  : undefined;
        const portalSlug =
            pathLocale && secondSegment && secondSegment !== pathLocale ? secondSegment : null;

        const resolvedLocale =
            pathLocale ??
            (requestedLocale && locales.includes(requestedLocale as (typeof locales)[number])
                ? requestedLocale
                : defaultLocale);

        // Canonical routes for QR flow are /{locale}/scan and /{locale}/{portal}/scan.
        // If someone opens legacy /scan, normalize URL first.
        if (!pathLocale) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("locale");
            const query = params.toString();
            router.replace(`/${resolvedLocale}/scan${query ? `?${query}` : ""}`);
            return;
        }

        const crmPath = portalSlug
            ? `/${resolvedLocale}/${portalSlug}/crm`
            : `/${resolvedLocale}/crm`;
        const attendancePath = `${crmPath}/attendance`;
        if (!code) {
            router.replace(attendancePath);
            return;
        }

        if (isProductLabelCode(code)) {
            router.replace(
                `${crmPath}/product/list?${SCAN_CODE_PARAM}=${encodeURIComponent(code)}`
            );
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
