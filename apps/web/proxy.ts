import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { defaultLocale, locales } from "./i18n";

const intlMiddleware = createIntlMiddleware({
    locales,
    defaultLocale,
    localePrefix: "always",
    localeDetection: false,
});

const MEMBER_ACCESS_COOKIE = "member_access_token";
const MEMBER_REFRESH_COOKIE = "member_refresh_token";

const PROTECTED_PREFIX = "/profile";
const AUTH_PREFIX = "/auth";

function stripLocalePrefix(pathname: string): string {
    // localePrefix: "always" => первый сегмент url - всегда locale
    return pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
}

function getLocaleFromPathname(pathname: string): string {
    const maybeLocale = pathname.split("/")[1];
    if (maybeLocale && locales.includes(maybeLocale as (typeof locales)[number])) {
        return maybeLocale;
    }
    return defaultLocale;
}

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

    const localeLessPath = stripLocalePrefix(pathname);
    const locale = getLocaleFromPathname(pathname);
    // Access-cookie живёт 15 минут; живой refresh-cookie означает,
    // что клиент восстановит сессию через /lk/auth/refresh
    const hasAuthCookie =
        request.cookies.has(MEMBER_ACCESS_COOKIE) || request.cookies.has(MEMBER_REFRESH_COOKIE);

    // Защищённые LK-маршруты — без cookie редиректим на login
    if (
        (localeLessPath === PROTECTED_PREFIX ||
            localeLessPath.startsWith(`${PROTECTED_PREFIX}/`)) &&
        !hasAuthCookie
    ) {
        const loginUrl = new URL(`/${locale}/auth/login`, request.url);
        loginUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Авторизованный пользователь на login/register — редирект в профиль
    if (
        hasAuthCookie &&
        (localeLessPath === `${AUTH_PREFIX}/login` || localeLessPath === `${AUTH_PREFIX}/register`)
    ) {
        return NextResponse.redirect(new URL(`/${locale}${PROTECTED_PREFIX}`, request.url));
    }

    return intlMiddleware(request);
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
