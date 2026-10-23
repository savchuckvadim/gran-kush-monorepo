import { BRAND_CODES, type BrandCode, getBrand } from "@workspace/brand";

/** One product site per installation (packages/brand): the build serves one of them. */
export const SITES = BRAND_CODES;

export type SiteCode = BrandCode;

/** The installation of this build (`NEXT_PUBLIC_SITE`); PafPaf when unset, an unknown code throws. */
export const BRAND = getBrand(process.env.NEXT_PUBLIC_SITE);

export const SITE: SiteCode = BRAND.code;

export const SITE_NAME = BRAND.name;

// `||`, not `??`: CI passes an unset GitHub variable as an empty build arg.
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || `https://${BRAND.domains.site}`;

export const absoluteUrl = (path: string) => new URL(path, SERVER_URL).toString();

export const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || `https://${BRAND.domains.crm}`;

/** Until Stripe approves the account the plans are «coming soon»; `true` opens the plan buttons. */
export const PLANS_PURCHASABLE = process.env.NEXT_PUBLIC_PLANS_PURCHASABLE === "true";

export const MEMBER_URL = process.env.NEXT_PUBLIC_MEMBER_URL || `https://${BRAND.domains.cabinet}`;
