import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { defaultLocale, locales } from "./i18n";
import {
    CABINET_TREE,
    isCabinetProtectedPath,
    isClubHost,
    MEMBER_ACCESS_COOKIE,
    MEMBER_REFRESH_COOKIE,
    resolveClubRoute,
    resolveRequestHost,
} from "./modules/shared/config/club-routes";

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

const isLocale = (value: string | undefined): value is (typeof locales)[number] =>
    !!value && (locales as readonly string[]).includes(value);

/**
 * Адрес на публичном хосте. В standalone-сборке за Traefik `nextUrl.host` — внутренний
 * `0.0.0.0:3000`, и редирект, собранный от него, увёл бы браузер мимо домена. Поэтому хост и схему
 * берём из заголовков прокси, если они есть.
 */
const publicUrl = (request: NextRequest, pathname: string): URL => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    if (forwardedHost) {
        // Присвоение `host` без порта оставило бы внутренний порт, поэтому имя и порт ставим раздельно
        const [hostname, port] = forwardedHost.split(":");
        url.hostname = hostname ?? url.hostname;
        url.port = port ?? "";
    }
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (forwardedProto) {
        url.protocol = `${forwardedProto}:`;
    }
    return url;
};

/**
 * Хост club.*: кабинет участника. Видимый адрес короткий (`/{язык}/{клуб}`), а страницы лежат в
 * дереве `app/[locale]/m/…`, поэтому запрос переписывается (`rewrite`) во внутренний адрес. Адресная
 * строка не меняется. Правила разбора — `resolveClubRoute` в `club-routes.ts`.
 *
 * Порядок важен: сначала next-intl (язык и его заголовки), и только потом rewrite с этими же
 * заголовками, иначе серверные `getTranslations()` откатываются на язык по умолчанию.
 */
function handleClubHost(request: NextRequest, segments: string[]): NextResponse {
    const [locale, ...rest] = segments;
    if (!isLocale(locale)) {
        // `/` и адреса без языка: next-intl сам уводит на `/{язык}/…`
        return intlMiddleware(request);
    }

    const action = resolveClubRoute(locale, rest);
    if (action.kind === "redirect") {
        return NextResponse.redirect(publicUrl(request, action.target), 308);
    }

    const hasSession =
        request.cookies.has(MEMBER_ACCESS_COOKIE) || request.cookies.has(MEMBER_REFRESH_COOKIE);
    if (action.kind === "rewrite" && isCabinetProtectedPath(rest) && !hasSession) {
        // Мёртвая сессия сюда доходит с живой на вид кукой: страница сама получит 401 и уйдёт на вход
        const loginUrl = publicUrl(request, `/${locale}/auth/login`);
        loginUrl.search = "";
        loginUrl.searchParams.set("from", request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    const intlResponse = intlMiddleware(request);
    if (action.kind === "pass") {
        return intlResponse;
    }

    const target = request.nextUrl.clone();
    target.pathname = action.target;
    return NextResponse.rewrite(target, { headers: intlResponse.headers });
}

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

    if (isClubHost(resolveRequestHost(request.headers))) {
        return handleClubHost(request, segments);
    }

    // Дерево кабинета (`/{язык}/m/…`) открывается только через хост club.: на адресе CRM его нет
    if (isLocale(locale) && second === CABINET_TREE) {
        const notFoundUrl = request.nextUrl.clone();
        notFoundUrl.pathname = `/${locale}/__not-found__`;
        return NextResponse.rewrite(notFoundUrl);
    }

    // Any auth cookie lets the request through to the CRM: a stale access cookie is refreshed by
    // the client, and a dead session gets a 401 there and is sent to the login page.
    const hasAuthCookie =
        request.cookies.has(CRM_ACCESS_COOKIE) || request.cookies.has(CRM_REFRESH_COOKIE);

    // [locale]/[portal]/crm/*, /scan and /print (sheets to print) — protected
    if (
        second &&
        second !== "auth" &&
        (third === "crm" || third === "scan" || third === "member" || third === "print")
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
         * - apple-icon (generated icon, served without an extension)
         * - files with extensions (e.g. .png, .jpg, .svg)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|apple-icon|.*\\..*).*)",
    ],
};
