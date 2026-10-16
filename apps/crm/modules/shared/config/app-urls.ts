import { isClubHost } from "./club-routes";

const trimSlash = (value: string | undefined): string => (value ?? "").replace(/\/+$/, "");

/** Origin of the CRM face of this app (`crm.`), set at build time; empty when not configured. */
const CRM_ORIGIN = trimSlash(process.env.NEXT_PUBLIC_CRM_URL);
/** Origin of the member cabinet face (`club.`), set at build time; empty when not configured. */
const CABINET_ORIGIN = trimSlash(process.env.NEXT_PUBLIC_MEMBER_URL);

const currentHost = (): string | null =>
    typeof window === "undefined" ? null : window.location.hostname.toLowerCase();

/**
 * One app, two hosts: the CRM on `crm.` and the cabinet on `club.` (`proxy.ts` routes by host).
 * A link to the other face needs that host's origin; without it the link is not shown, because the
 * same path on the wrong host opens a different page (`/{locale}/{club}` is a CRM club on `crm.`
 * and a member's club on `club.`).
 */
export const cabinetAppUrl = (path: string): string | null => {
    if (CABINET_ORIGIN) return `${CABINET_ORIGIN}${path}`;
    const host = currentHost();
    return host && isClubHost(host) ? path : null;
};

export const crmAppUrl = (path: string): string | null => {
    if (CRM_ORIGIN) return `${CRM_ORIGIN}${path}`;
    const host = currentHost();
    return host && !isClubHost(host) ? path : null;
};

/**
 * An absolute address to hand out (a club link, its QR): the cabinet when its origin is known,
 * otherwise the page's own origin — the link pages are shared by both hosts.
 */
export const shareableUrl = (path: string): string => {
    const origin = CABINET_ORIGIN || (typeof window === "undefined" ? "" : window.location.origin);
    return `${origin}${path}`;
};
