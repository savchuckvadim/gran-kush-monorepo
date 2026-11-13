import installation from "@/installation.json";

export const SITE_NAME = "IT-firma";

export const CONTACT_EMAIL = installation.contactEmail;

// `||`, not `??`: CI passes an unset GitHub variable as an empty build arg.
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || `https://${installation.domain}`;

export const absoluteUrl = (path: string) => new URL(path, SERVER_URL).toString();

/** The person behind the studio, as the legal pages and the footer name them. */
export const OWNER = {
    name: "Vadim Savchuk",
    /**
     * NIE (for a foreigner it is also the NIF). Comes from the environment so the number is not
     * committed: `NEXT_PUBLIC_OWNER_NIF` in `.env.local` locally and in the GitHub repository variables
     * for the image (deploy.yml passes it to the build; the pages are static). `||`, not `??`, for the
     * same reason as `SERVER_URL`.
     */
    nif: process.env.NEXT_PUBLIC_OWNER_NIF || "[NIF pendiente]",
    /** Postal address shown on the legal pages; same rule as `nif` (`NEXT_PUBLIC_OWNER_ADDRESS`). */
    address: process.env.NEXT_PUBLIC_OWNER_ADDRESS || "[Dirección pendiente]",
    country: "España",
} as const;
