export const SITES = ["pafpaf", "nagual"] as const;

export type SiteCode = (typeof SITES)[number];

const isSite = (value: string | undefined): value is SiteCode =>
    (SITES as readonly string[]).includes(value ?? "");

const fromEnv = process.env.NEXT_PUBLIC_SITE;

export const SITE: SiteCode = isSite(fromEnv) ? fromEnv : "pafpaf";

const PRODUCTION_URLS: Record<SiteCode, string> = {
    pafpaf: "https://paf-paf.app",
    nagual: "https://nagual.club",
};

// `||`, not `??`: CI passes an unset GitHub variable as an empty build arg.
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || PRODUCTION_URLS[SITE];

export const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "https://crm.paf-paf.app";

export const MEMBER_URL = process.env.NEXT_PUBLIC_MEMBER_URL || "https://club.paf-paf.app";
