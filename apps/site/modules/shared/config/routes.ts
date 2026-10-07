import type { Locale } from "./locales";

export const HOME_SLUG = "home";

export const ROUTES = {
    home: (locale: Locale) => `/${locale}`,
    page: (locale: Locale, slug: string) =>
        slug === HOME_SLUG ? `/${locale}` : `/${locale}/${slug}`,
};

// CMS links: "/precios" is a page of this site, "#entrada" an anchor, anything else is external.
export const resolveHref = (href: string | null | undefined, locale: Locale): string => {
    if (!href) return ROUTES.home(locale);
    if (href.startsWith("#") || /^[a-z]+:/i.test(href)) return href;
    if (href.startsWith("/")) return ROUTES.page(locale, href.slice(1) || HOME_SLUG);
    return href;
};
