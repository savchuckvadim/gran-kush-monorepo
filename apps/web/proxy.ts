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

/**
 * Next.js 16: proxy для обработки locale в URL
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
    // Handle internationalization first
    const response = intlMiddleware(request);

    return response;
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
