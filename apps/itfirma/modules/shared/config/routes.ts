export const LEGAL_DOCS = ["aviso-legal", "privacidad", "cookies"] as const;

export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const isLegalDoc = (value: string): value is LegalDoc =>
    (LEGAL_DOCS as readonly string[]).includes(value);

/** Anchors of the one-page home, in menu order. */
export const HOME_SECTIONS = ["services", "products", "process", "about", "contact"] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number];

export const LEAD_ENDPOINT = "/api/lead";
