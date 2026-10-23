import { type BrandConfig, getBrand } from "@workspace/brand";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** The file ConfigModule reads; locally `BRAND` may live only there. */
const ENV_FILE = ".env";

/** `BRAND` from the container, or from the env file when the process was started without it. */
const brandCode = (): string | undefined => {
    if (process.env.BRAND !== undefined) return process.env.BRAND.trim();
    if (!existsSync(ENV_FILE)) return undefined;
    return parseEnv(readFileSync(ENV_FILE, "utf8")).BRAND?.trim();
};

/**
 * The brand for module-level texts (email copy), which are built on import — before Nest and its
 * ConfigModule exist, so this reads the env file itself. Everything with DI asks `BrandService`.
 */
export const INSTALLATION_BRAND: BrandConfig = getBrand(brandCode());
