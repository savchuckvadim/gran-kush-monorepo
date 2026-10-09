import type { SchemaMyPortalDto } from "@workspace/api-client/core";

import { ROUTES } from "@/modules/shared/config/routes";

// `from` comes from the URL, so it is followed only inside the club being opened
const isSafeReturnPath = (from: string | null, clubPrefix: string): from is string =>
    Boolean(
        from && from.startsWith(`${clubPrefix}/`) && !from.includes("//") && !from.includes("..")
    );

/**
 * Where a signed-in user goes from the login page, or `null` when they have to pick a club:
 * the club from the URL if they work there, otherwise their only club.
 */
export const resolveClubTarget = (
    clubs: SchemaMyPortalDto[],
    locale: string,
    urlClub: string | null,
    from: string | null
): string | null => {
    if (urlClub) {
        if (!clubs.some((club) => club.slug === urlClub)) return null;
        const prefix = `/${locale}/${urlClub}`;
        return isSafeReturnPath(from, prefix) ? from : `${prefix}${ROUTES.CRM_HOME}`;
    }
    const [only] = clubs;
    return clubs.length === 1 && only ? `/${locale}/${only.slug}${ROUTES.CRM_HOME}` : null;
};
