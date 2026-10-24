import { HAS_PRODUCTS } from "./products";

export const LEGAL_DOCS = ["aviso-legal", "privacidad", "cookies"] as const;

export type LegalDoc = (typeof LEGAL_DOCS)[number];

export const isLegalDoc = (value: string): value is LegalDoc =>
    (LEGAL_DOCS as readonly string[]).includes(value);

const ALL_SECTIONS = ["services", "products", "process", "about", "contact"] as const;

export type HomeSection = (typeof ALL_SECTIONS)[number];

/** Anchors of the one-page home, in menu order; products only while there is one to show. */
export const HOME_SECTIONS: readonly HomeSection[] = ALL_SECTIONS.filter(
    (section) => section !== "products" || HAS_PRODUCTS
);

/** «01», «02»… by the section's place among the shown ones. */
export const sectionNumber = (section: HomeSection) =>
    String(HOME_SECTIONS.indexOf(section) + 1).padStart(2, "0");

export const LEAD_ENDPOINT = "/api/lead";
