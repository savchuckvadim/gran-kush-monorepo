import { HAS_PRODUCTS } from "./products";

export const LEGAL_DOCS = ["aviso-legal", "privacidad", "cookies"] as const;

export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const isLegalDoc = (value: string): value is LegalDoc =>
    (LEGAL_DOCS as readonly string[]).includes(value);

const ALL_SECTIONS = [
    "services",
    "products",
    "cases",
    "process",
    "team",
    "faq",
    "contact",
] as const;

export type HomeSection = (typeof ALL_SECTIONS)[number];

/** Anchors of the one-page home, in page order; products only while there is one to show. */
export const HOME_SECTIONS: readonly HomeSection[] = ALL_SECTIONS.filter(
    (section) => section !== "products" || HAS_PRODUCTS
);

/** Sections the header menu offers; the rest are reached by scrolling or from the footer. */
export const MENU_SECTIONS: readonly HomeSection[] = HOME_SECTIONS.filter((section) =>
    (["services", "cases", "process", "team"] as HomeSection[]).includes(section)
);

/** Where every «request a quote» button leads: the form at the end of the home page. */
export const CONTACT_PATH = "/#contact";

export const LEAD_ENDPOINT = "/api/lead";
