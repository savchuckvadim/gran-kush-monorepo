import { isClubHost } from "@/modules/shared/config/club-routes";

/**
 * Public address of a registration link.
 *
 * The member cabinet (`club.`) is optional on a server — in Dokploy it starts only with the
 * `club` profile — so the page that the link opens lives in the CRM itself (`/{locale}/join/{token}`).
 * When a cabinet is deployed and `NEXT_PUBLIC_MEMBER_URL` points at it, links go there instead:
 * the registered member then lands straight in their own cabinet.
 */
const MEMBER_URL = (process.env.NEXT_PUBLIC_MEMBER_URL || "").replace(/\/$/, "");

export const buildJoinUrl = (locale: string, token: string): string => {
    const origin = MEMBER_URL || (typeof window === "undefined" ? "" : window.location.origin);
    return `${origin}/${locale}/join/${token}`;
};

/**
 * Адрес в кабинете участника, если он известен: страница открыта на `club.` или задан
 * `NEXT_PUBLIC_MEMBER_URL`. На хосте CRM без кабинета — `null`: там `/{язык}/{клуб}` вёл бы
 * в CRM, а не в кабинет.
 */
export const buildCabinetUrl = (path: string): string | null => {
    if (MEMBER_URL) return `${MEMBER_URL}${path}`;
    if (typeof window !== "undefined" && isClubHost(window.location.hostname.toLowerCase())) {
        return path;
    }
    return null;
};
