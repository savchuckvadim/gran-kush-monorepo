import type { Locale } from "./locales";
import { CRM_URL } from "./site";

export const HOME_SLUG = "home";

export const ROUTES = {
    home: (locale: Locale) => `/${locale}`,
    page: (locale: Locale, slug: string) =>
        slug === HOME_SLUG ? `/${locale}` : `/${locale}/${slug}`,
    legal: (locale: Locale, doc: string) => `/${locale}/legal/${doc}`,
};

const CRM_PATHS = {
    login: "auth/login",
    register: "auth/register",
} as const;

export type CrmTarget = keyof typeof CRM_PATHS;

const isCrmTarget = (value: string): value is CrmTarget =>
    (Object.keys(CRM_PATHS) as string[]).includes(value);

// The CRM speaks the same three locales; ?plan= carries the API billing code into the sign-up form.
export const crmHref = (locale: Locale, target: CrmTarget, plan?: string | null): string => {
    const url = new URL(`${CRM_URL.replace(/\/$/, "")}/${locale}/${CRM_PATHS[target]}`);
    if (plan) url.searchParams.set("plan", plan);
    return url.toString();
};

// CMS links: "/precios" is a page of this site, "#entrada" an anchor, "crm:register" / "crm:login"
// the CRM (its domain differs per environment, so the CMS never stores it), anything else is external.
export const resolveHref = (href: string | null | undefined, locale: Locale): string => {
    if (!href) return ROUTES.home(locale);
    if (href.startsWith("crm:")) {
        const target = href.slice("crm:".length);
        return crmHref(locale, isCrmTarget(target) ? target : "login");
    }
    if (href.startsWith("#") || /^[a-z]+:/i.test(href)) return href;
    if (href.startsWith("/")) return ROUTES.page(locale, href.slice(1) || HOME_SLUG);
    return href;
};
