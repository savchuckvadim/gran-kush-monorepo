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

    // Any auth cookie lets the request through to the CRM: a stale access cookie is refreshed by
    // the client, and a dead session gets a 401 there and is sent to the login page.
    const hasAuthCookie =
        request.cookies.has(CRM_ACCESS_COOKIE) || request.cookies.has(CRM_REFRESH_COOKIE);

    // [locale]/[portal]/crm/* and [locale]/[portal]/scan — protected
    if (
        second &&
        second !== "auth" &&
        (third === "crm" || third === "scan" || third === "member")
    ) {
        if (!hasAuthCookie) {
            const loginUrl = new URL(`/${locale}/${second}/auth/login`, request.url);
            loginUrl.searchParams.set("from", pathname);
            return NextResponse.redirect(loginUrl);
        }
    }

    // [locale]/[portal]/auth/* is never bounced back to the CRM here. A cookie says nothing about the
    // session behind it: a deactivated employee keeps a valid-looking access cookie for up to a day,
    // the CRM answers 401 and sends them to login, and a redirect back on that cookie looped
    // /auth ↔ /crm hundreds of times a second until the rate limiter stopped it. The login page
    // asks the API itself (my-portals) and leaves for the club only when the session is alive.

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
