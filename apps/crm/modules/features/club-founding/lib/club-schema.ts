import type { useTranslations } from "next-intl";

import { z } from "zod";

import { PORTAL_SLUG_MAX, PORTAL_SLUG_MIN, PORTAL_SLUG_PATTERN } from "./portal-slug";

type Translate = ReturnType<typeof useTranslations>;

/**
 * Fields of a new club, the same for the registration from the product site and for one more club
 * of a signed-in account. The rules mirror `CreateClubDto` on the API. `t` is `auth.portalRegister`.
 */
export const clubFieldsShape = (t: Translate) => ({
    displayName: z
        .string()
        .trim()
        .min(2, t("errors.displayName"))
        .max(100, t("errors.displayName")),
    slug: z
        .string()
        .min(PORTAL_SLUG_MIN, t("errors.slugLength"))
        .max(PORTAL_SLUG_MAX, t("errors.slugLength"))
        .regex(PORTAL_SLUG_PATTERN, t("errors.slugChars")),
    ownerName: z.string().trim().min(2, t("errors.ownerName")).max(100, t("errors.ownerName")),
    acceptTerms: z.boolean().refine((accepted) => accepted, t("errors.acceptTerms")),
});
