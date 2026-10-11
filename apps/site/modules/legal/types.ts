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
    pending: Record<"nif" | "address" | "email", string>;
}

export interface LegalContent {
    ui: LegalUi;
    docs: Record<LegalDocId, LegalDoc>;
}
