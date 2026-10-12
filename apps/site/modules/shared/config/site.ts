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

const SITE_NAMES: Record<SiteCode, string> = {
    pafpaf: "PafPaf",
    nagual: "Nagual",
};

export const SITE_NAME = SITE_NAMES[SITE];

// `||`, not `??`: CI passes an unset GitHub variable as an empty build arg.
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || PRODUCTION_URLS[SITE];

export const absoluteUrl = (path: string) => new URL(path, SERVER_URL).toString();

export const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || "https://crm.paf-paf.app";

/** Until Stripe approves the account the plans are «coming soon»; `true` opens the plan buttons. */
export const PLANS_PURCHASABLE = process.env.NEXT_PUBLIC_PLANS_PURCHASABLE === "true";

export const MEMBER_URL = process.env.NEXT_PUBLIC_MEMBER_URL || "https://club.paf-paf.app";
