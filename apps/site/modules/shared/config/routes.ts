import type { Locale } from "./locales";
import { CRM_URL } from "./site";

export const HOME_SLUG = "home";

export const ROUTES = {
    home: (locale: Locale) => `/${locale}`,
    page: (locale: Locale, slug: string) =>
        slug === HOME_SLUG ? `/${locale}` : `/${locale}/${slug}`,
    legal: (locale: Locale, doc: string) => `/${locale}/legal/${doc}`,
    legalFile: (locale: Locale, doc: string, format: string) => `/${locale}/legal/${doc}/${format}`,
    partners: (locale: Locale) => `/${locale}/partners`,
    partnersFile: (locale: Locale, format: string) => `/${locale}/partners/${format}`,
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

const SAFE_LINK_SCHEMES: ReadonlySet<string> = new Set(["http:", "https:", "mailto:", "tel:"]);

// The browser's own URL parser: it drops tabs and leading spaces the same way, so " java\tscript:"
// is caught too. A string it cannot parse without a base is a relative link.
const absoluteScheme = (href: string): string | null => {
    try {
        return new URL(href).protocol;
    } catch {
        return null;
    }
};

// CMS links: "/precios" is a page of this site, "#entrada" an anchor, "crm:register" / "crm:login"
// the CRM (its domain differs per environment, so the CMS never stores it), anything else is external.
export const resolveHref = (href: string | null | undefined, locale: Locale): string => {
    if (!href) return ROUTES.home(locale);
    if (href.startsWith("crm:")) {
        const target = href.slice("crm:".length);
        return crmHref(locale, isCrmTarget(target) ? target : "login");
    }
    if (href.startsWith("#")) return href;
    if (href.startsWith("/")) return ROUTES.page(locale, href.slice(1) || HOME_SLUG);
    const scheme = absoluteScheme(href);
    if (scheme === null) return href;
    // An editor account must not be enough to run script on every visitor's page (javascript:, data:)
    return SAFE_LINK_SCHEMES.has(scheme) ? href : ROUTES.home(locale);
};
