import { defaultLocale, locales } from "@/i18n";
import { isReservedClubSlug } from "@/modules/shared/config/club-routes";
import { ROUTES } from "@/modules/shared/config/routes";

// All /crm/* routes require authentication
export const PROTECTED_ROUTES = ["/crm"] as const;

type RouteContext = {
    portalSlug: string | null;
    locale: string;
    pathnameWithoutPortalAndLocale: string;
};

export function getRouteContext(pathname: string): RouteContext {
    const segments = pathname.split("/").filter(Boolean);

    const firstSegment = segments[0];
    const secondSegment = segments[1];

    if (firstSegment && locales.includes(firstSegment as (typeof locales)[number])) {
        const maybePortal =
            // Зарезервированные слова (auth, join, clubs, …) — страницы, а не клубы: один список с API
            secondSegment && !isReservedClubSlug(secondSegment) ? secondSegment : null;
        const pathnameWithoutPortalAndLocale =
            `/${segments.slice(maybePortal ? 2 : 1).join("/")}` || "/";
        return {
            portalSlug: maybePortal,
            locale: firstSegment,
            pathnameWithoutPortalAndLocale,
        };
    }

    return {
        portalSlug: null,
        locale: defaultLocale,
        pathnameWithoutPortalAndLocale: pathname || "/",
    };
}

export function getLocaleFromPathname(pathname: string): string {
    return getRouteContext(pathname).locale;
}

export function isProtectedRoute(pathnameWithoutLocale: string): boolean {
    return PROTECTED_ROUTES.some(
        (route) => pathnameWithoutLocale === route || pathnameWithoutLocale.startsWith(`${route}/`)
    );
}

export function getLoginUrl(pathname: string): string {
    const { locale, portalSlug } = getRouteContext(pathname);
    return portalSlug ? `/${locale}/${portalSlug}${ROUTES.LOGIN}` : `/${locale}${ROUTES.LOGIN}`;
}
