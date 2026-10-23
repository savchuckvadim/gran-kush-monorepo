export const BRAND_CODES = ["pafpaf", "inkspace", "plisplas"] as const;
export type BrandCode = (typeof BRAND_CODES)[number];

/**
 * Root features an installation offers at all. Business code asks `hasBrandModule(brand, code)`,
 * never `brand.code === …`. A club's own switches (`portal_modules`, e.g. finance) work inside
 * what its installation offers.
 */
export const BRAND_MODULE_CODES = [
    /** Door and attendance: presence, member QR codes, scans. */
    "presence",
    /** Club rules: shop access, monthly limits. */
    "club-policy",
    /** Paid plans: the 402 gate, the subscription page, checkout. */
    "billing",
] as const;
export type BrandModuleCode = (typeof BRAND_MODULE_CODES)[number];

/** Keys of Prisma `PortalTypeEnum`: every portal an installation founds is of this kind. */
export type BrandPortalType = "CLUB" | "TATTOO_STUDIO" | "BEAUTY_STUDIO";

/** Hostnames without scheme, e.g. `crm.paf-paf.app`. */
export interface BrandDomains {
    site: string;
    crm: string;
    /** Member or client cabinet: `club.` for clubs, `app.` for studios. */
    cabinet: string;
    api: string;
}

/** One shape of the brand mark in a 24×24 box, painted with the brand gradient. */
export type BrandMarkShape =
    | { kind: "circle"; cx: number; cy: number; r: number; opacity?: number }
    | { kind: "path"; d: string; opacity?: number };

export interface BrandMark {
    /** Crop of the 24×24 box for app icons, where the mark fills the square. */
    iconViewBox: string;
    shapes: readonly BrandMarkShape[];
}

export interface BrandConfig {
    code: BrandCode;
    /** Product name in texts: «PafPaf», «Ink Space». */
    name: string;
    /** Name of the member or client cabinet: the tab title and the installed app. */
    cabinetName: string;
    /** Lowercase lettering of the logo, used where the site writes it («paf paf»). */
    wordmark: string;
    portalType: BrandPortalType;
    modules: readonly BrandModuleCode[];
    /** CRM skin an account sees until it picks one. */
    defaultSkin: string;
    /** CRM skins this installation does not offer: they carry another brand's look. */
    hiddenSkins: readonly string[];
    /**
     * The logo lettering the Black skin draws instead of the name: a mask in the CRM's public
     * folder. `null` — the skin writes the name in its own font.
     */
    skinLettering: string | null;
    /** Gradient of the mark, stops at 0, .55 and 1; the first one is the browser theme colour. */
    palette: readonly [string, string, string];
    mark: BrandMark;
    domains: BrandDomains;
}
