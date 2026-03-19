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
 * Protected routes that require authentication
 */


/**
 * Public routes that don't require authentication
 */
// const PUBLIC_ROUTES = [
//     "/",
//     "/about-us",
//     "/contacts",
//     "/auth/login",
//     "/auth/register",
//     "/auth/forgot-password",
//     "/auth/reset-password",
//     "/auth/confirm-email",
// ];

/**
 * Check if user is authenticated by checking for access token in cookies
 * Note: In Next.js 16, we can't access localStorage in proxy, so we check cookies
 * The API client should set cookies when tokens are stored
 */
// function isAuthenticated(request: NextRequest): boolean {
//     // Check for access token cookie (set by API client or manually)
//     const accessToken = request.cookies.get("site.accessToken")?.value;
//     // Also check for the token in Authorization header (for API calls)
//     const authHeader = request.headers.get("authorization");
    
//     return !!accessToken || !!authHeader;
// }

/**
 * Check if pathname matches a protected route pattern
 */
// function isProtectedRoute(pathname: string): boolean {
//     // Remove locale prefix if present
//     const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
    
//     return PROTECTED_ROUTES.some((route) => {
//         if (route === "/profile") {
//             // Match /profile and all sub-routes
//             return pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`);
//         }
//         return pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`);
//     });
// }

/**
 * Check if pathname matches a public route
 */
// function isPublicRoute(pathname: string): boolean {
//     const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
//     return PUBLIC_ROUTES.some((route) => pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`));
// }

/**
 * Next.js 16: proxy для обработки locale в URL и защиты маршрутов
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

    // Check authentication for protected routes
    // if (isProtectedRoute(pathname)) {
        // if (!isAuthenticated(request)) {
        //     // Redirect to login page
        //     const locale = pathname.split("/")[1] || defaultLocale;
        //     const loginUrl = new URL(`/${locale}${ROUTES.LOGIN}`, request.url);
        //     loginUrl.searchParams.set("redirect", pathname);
        //     return NextResponse.redirect(loginUrl);
        // }
    // }

    // Handle internationalization
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
