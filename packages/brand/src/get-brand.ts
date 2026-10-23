import { inkspace } from "./brands/inkspace";
import { pafpaf } from "./brands/pafpaf";
import { plisplas } from "./brands/plisplas";
import { BRAND_CODES, type BrandCode, type BrandConfig, type BrandModuleCode } from "./types";

export const BRANDS: Record<BrandCode, BrandConfig> = { pafpaf, inkspace, plisplas };

/** Brand of a process started without `BRAND`: local development and tests. */
export const DEFAULT_BRAND: BrandCode = "pafpaf";

export const isBrandCode = (value: unknown): value is BrandCode =>
    typeof value === "string" && (BRAND_CODES as readonly string[]).includes(value);

/**
 * The installation's brand by its code (`BRAND`, `NEXT_PUBLIC_BRAND`). Empty means the default; a
 * code that is set but unknown is a misconfigured installation and throws, so the process does not
 * start under someone else's name.
 */
export const getBrand = (code: string | undefined): BrandConfig => {
    if (!code) return BRANDS[DEFAULT_BRAND];
    if (!isBrandCode(code)) {
        throw new Error(`Unknown brand "${code}": expected one of ${BRAND_CODES.join(", ")}`);
    }
    return BRANDS[code];
};

export const hasBrandModule = (brand: BrandConfig, code: BrandModuleCode): boolean =>
    brand.modules.includes(code);
