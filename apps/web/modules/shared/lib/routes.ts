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
