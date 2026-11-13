/**
 * Who sells PafPaf. `null` renders as a highlighted "pending" mark until the lawyer review:
 * fill these in before the pages are opened to search engines (LEGAL_INDEXABLE).
 * NIF and address are not committed: `NEXT_PUBLIC_OWNER_NIF` / `NEXT_PUBLIC_OWNER_ADDRESS` in
 * `.env.local` locally and in the GitHub repository variables for the image (inlined at build time).
 * `||`, not `??`: an unset build arg arrives as an empty string.
 */
export const PROVIDER = {
    name: "Vadim Savchuk",
    nif: process.env.NEXT_PUBLIC_OWNER_NIF || null,
    address: process.env.NEXT_PUBLIC_OWNER_ADDRESS || null,
    email: "savchuckvadim@gmail.com" as string | null,
};

/**
 * Bumped with every change of the texts, together with LEGAL_TERMS_VERSION in
 * apps/api/src/common/legal/legal-terms.ts: club registration stores that version.
 */
export const LEGAL_VERSION = "2026-10-11";

/** Draft texts with placeholders stay out of search results. */
export const LEGAL_INDEXABLE = false;
