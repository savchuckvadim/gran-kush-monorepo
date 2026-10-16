export const LEGAL_DOCS = [
    "aviso-legal",
    "privacidad",
    "cookies",
    "terminos",
    "encargo",
    "subencargados",
] as const;

export type LegalDocId = (typeof LEGAL_DOCS)[number];

export const isLegalDoc = (value: string): value is LegalDocId =>
    (LEGAL_DOCS as readonly string[]).includes(value);

export const LEGAL_FORMATS = ["pdf", "docx"] as const;

export type LegalFormat = (typeof LEGAL_FORMATS)[number];

export const isLegalFormat = (value: string): value is LegalFormat =>
    (LEGAL_FORMATS as readonly string[]).includes(value);

/**
 * Inline text: `[label](doc:privacidad)` links another legal page, `[label](https://…)` an external one;
 * `{name}`, `{nif}`, `{address}`, `{email}` are the provider's details from provider.ts.
 */
export type LegalBlock =
    | string
    | { list: string[] }
    | { table: { head: string[]; rows: string[][] } };

export interface LegalSection {
    heading: string;
    blocks: LegalBlock[];
}

export interface LegalDoc {
    title: string;
    description: string;
    sections: LegalSection[];
}

export interface LegalUi {
    eyebrow: string;
    updated: string;
    /** Shown on translations: the Spanish text is the binding one. */
    translationNote?: string;
    otherDocs: string;
    smoke: string;
    download: string;
    pending: Record<"nif" | "address" | "email", string>;
}

export interface LegalContent {
    ui: LegalUi;
    docs: Record<LegalDocId, LegalDoc>;
}
