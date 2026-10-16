import { shareableUrl } from "@/modules/shared/config/app-urls";

/**
 * Public address of a registration link. The page lives in this app on both hosts; with the
 * cabinet origin configured the link opens on `club.`, where a registered member lands straight
 * in their own cabinet.
 */
export const buildJoinUrl = (locale: string, token: string): string =>
    shareableUrl(`/${locale}/join/${token}`);
