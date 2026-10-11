const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://paf-paf.app").replace(/\/$/, "");

/** Pages of the product site: `apps/site/modules/legal`. */
export type LegalDoc = "terminos" | "privacidad";

export const legalPageUrl = (locale: string, doc: LegalDoc): string =>
    `${SITE_URL}/${locale}/legal/${doc}`;
