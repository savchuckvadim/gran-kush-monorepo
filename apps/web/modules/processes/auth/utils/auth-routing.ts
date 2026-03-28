import { defaultLocale, locales } from "@/i18n";
import { ROUTES } from "@/modules/shared/config/routes";

export const PROTECTED_ROUTES = [
    "/profile",
    "/profile/settings",
    "/profile/qr-code",
    "/profile/presence",
] as const;

export function stripLocalePrefix(pathname: string): string {
    // localePrefix: "always" => первый сегмент url - всегда locale
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
    return PROTECTED_ROUTES.some((route) => {
        if (route === "/profile") {
            return pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`);
        }
        return pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`);
    });
}

export function getLoginUrl(pathname: string): string {
    const locale = getLocaleFromPathname(pathname);
    return `/${locale}${ROUTES.LOGIN}`;
}
