export const SITES = ["pafpaf", "nagual"] as const;

export type SiteCode = (typeof SITES)[number];

const isSite = (value: string | undefined): value is SiteCode =>
    (SITES as readonly string[]).includes(value ?? "");

const fromEnv = process.env.NEXT_PUBLIC_SITE;

export const SITE: SiteCode = isSite(fromEnv) ? fromEnv : "pafpaf";

export const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL ?? "https://crm.paf-paf.app";

export const MEMBER_URL = process.env.NEXT_PUBLIC_MEMBER_URL ?? "https://club.paf-paf.app";
