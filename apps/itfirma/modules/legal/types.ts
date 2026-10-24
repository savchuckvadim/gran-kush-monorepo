import type { LegalDoc } from "@/modules/shared/config/routes";

export interface LegalSection {
    heading: string;
    /** Paragraphs; `{name}`, `{nif}`, `{address}`, `{email}`, `{domain}` are filled from the site config. */
    paragraphs: readonly string[];
}

export interface LegalDocument {
    title: string;
    sections: readonly LegalSection[];
}

export type LegalContent = Record<LegalDoc, LegalDocument>;

/** Date of the current wording; shown on every legal page. */
export const LEGAL_VERSION = "2026-10-24";
