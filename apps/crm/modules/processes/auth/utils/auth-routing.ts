import { defaultLocale, locales } from "@/i18n";
import { ROUTES } from "@/modules/shared/config/routes";

// All /crm/* routes require authentication
export const PROTECTED_ROUTES = ["/crm"] as const;

export function stripLocalePrefix(pathname: string): string {
    // localePrefix: "always" => first url segment is always the locale
    return pathname.replace(/^\/[a-z]{2}(-[A-Z]{2})?/, "") || "/";
}

export function getLocaleFromPathname(pathname: string): string {
    const maybeLocale = pathname.split("/")[1];
    if (maybeLocale && locales.includes(maybeLocale as (typeof locales)[number])) {
        return maybeLocale;
    }
    return defaultLocale;
}

export function isProtectedRoute(pathnameWithoutLocale: string): boolean {
    return PROTECTED_ROUTES.some(
        (route) =>
            pathnameWithoutLocale === route ||
            pathnameWithoutLocale.startsWith(`${route}/`),
    );
}

export function getLoginUrl(pathname: string): string {
    const locale = getLocaleFromPathname(pathname);
    return `/${locale}${ROUTES.LOGIN}`;
}
