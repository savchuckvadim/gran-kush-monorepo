/**
 * Who sells PafPaf. `null` renders as a highlighted "pending" mark until the lawyer review:
 * fill these in before the pages are opened to search engines (LEGAL_INDEXABLE).
 */
export const PROVIDER = {
    name: "Vadim Savchuk",
    nif: null as string | null,
    address: null as string | null,
    email: null as string | null,
};

/** Bumped with every change of the texts; registration will store the version a club accepted. */
export const LEGAL_VERSION = "2026-10-11";

/** Draft texts with placeholders stay out of search results. */
export const LEGAL_INDEXABLE = false;
