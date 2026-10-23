import { type BrandModuleCode, getBrand, hasBrandModule } from "@workspace/brand";

/**
 * The installation this build serves (`NEXT_PUBLIC_BRAND`, baked in at build time; PafPaf when
 * unset). It must match the API's `BRAND`: CI builds the CRM once per installation.
 */
export const BRAND = getBrand(process.env.NEXT_PUBLIC_BRAND);

/** Whether the installation offers a root feature at all: hides its menu items and settings. */
export const brandHas = (module: BrandModuleCode): boolean => hasBrandModule(BRAND, module);
