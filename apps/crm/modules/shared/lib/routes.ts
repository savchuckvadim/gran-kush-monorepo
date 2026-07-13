import { Locale } from "@/i18n";

/**
 * Helper function to generate routes with locale prefix
 * For use with next-intl Link component which handles locale automatically
 */
export function getLocalizedRoute(route: string): string {
    // If using next-intl Link, it will automatically add locale prefix
    // So we can return routes as-is
    return route;
}

/**
 * Generate route with locale prefix manually if needed
 */
export function getRouteWithLocale(route: string, locale: Locale): string {
    return `/${locale}${route}`;
}

// ─── Portal-scoped route builders ────────────────────────────────────────────
// Use these in server components, middleware, or anywhere React hooks are unavailable.
// In client components, prefer `useLocalizedLink()` from use-localized-link.ts.

/** Build a full CRM path: `/${locale}/${portal}${path}` */
export function buildCrmRoute(locale: string, portal: string, path: string): string {
    const clean = path.startsWith("/") ? path : `/${path}`;
    return `/${locale}/${portal}${clean}`;
}

/** Build a portal auth path: `/${locale}/${portal}/auth/${type}` */
export function buildAuthRoute(
    locale: string,
    portal: string,
    type: "login" | "register" | "confirm-email"
): string {
    return `/${locale}/${portal}/auth/${type}`;
}
