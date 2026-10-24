import installation from "@/installation.json";

export const SITE_NAME = "IT-firma";

export const CONTACT_EMAIL = installation.contactEmail;

// `||`, not `??`: CI passes an unset GitHub variable as an empty build arg.
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || `https://${installation.domain}`;

export const absoluteUrl = (path: string) => new URL(path, SERVER_URL).toString();

/** The person behind the studio, as the legal pages and the footer name them. */
export const OWNER = {
    name: "Vadim Savchuk",
    /** Filled once the autónomo registration is done. */
    nif: "[NIF pendiente]",
    address: "[Dirección pendiente]",
    country: "España",
} as const;
