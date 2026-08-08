import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { defaultLocale, locales } from "./i18n";

/**
 * Определяет locale из Accept-Language header или cookie
 */
const intlMiddleware = createIntlMiddleware({
    locales,
    defaultLocale,
    localePrefix: "always",
    localeDetection: false,
});

const CRM_ACCESS_COOKIE = "crm_access_token";
const CRM_REFRESH_COOKIE = "crm_refresh_token";

/**
 * Next.js 16: proxy (бывший middleware) — locale в URL + защита CRM-маршрутов
 */
export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Пропускаем статические файлы и API routes
    if (
        pathname.startsWith("/api") ||
        pathname.startsWith("/_next") ||
        pathname.startsWith("/_vercel") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // segments: [locale, portal?, section?, ...]
    const segments = pathname.split("/").filter(Boolean);
    const locale = segments[0];
    const second = segments[1]; // portal slug or "auth"
    const third = segments[2]; // "crm", "auth", "scan", "member", ...

    // Access-cookie живёт 15 минут; живой refresh-cookie означает,
    // что клиент восстановит сессию через /crm/auth/refresh
    const hasAuthCookie =
        request.cookies.has(CRM_ACCESS_COOKIE) || request.cookies.has(CRM_REFRESH_COOKIE);

    // [locale]/[portal]/crm/* and [locale]/[portal]/scan — protected
    if (second && second !== "auth" && (third === "crm" || third === "scan" || third === "member")) {
        if (!hasAuthCookie) {
            const loginUrl = new URL(`/${locale}/${second}/auth/login`, request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // [locale]/[portal]/auth/* — redirect to CRM if already authenticated
    if (second && second !== "auth" && third === "auth" && hasAuthCookie) {
        return NextResponse.redirect(new URL(`/${locale}/${second}/crm`, request.url));
    }

    return intlMiddleware(request);
}

export const config = {
    // Match all pathnames except for
    // - API routes (/api)
    // - Next.js internals (_next)
    // - Static files (.*\\.*)
    // - Vercel internals (_vercel)
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - files with extensions (e.g. .png, .jpg, .svg)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
    ],
};
