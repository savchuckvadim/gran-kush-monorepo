import { BRAND } from "./brand";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || `https://${BRAND.domains.site}`).replace(
    /\/$/,
    ""
);

/** Pages of the product site: `apps/site/modules/legal`. */
export type LegalDoc = "terminos" | "encargo" | "privacidad";

export const legalPageUrl = (locale: string, doc: LegalDoc): string =>
    `${SITE_URL}/${locale}/legal/${doc}`;
