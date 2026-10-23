import { getBrand } from "@workspace/brand";

/** The installation this admin serves (`NEXT_PUBLIC_BRAND`, baked in at build; PafPaf when unset). */
export const BRAND = getBrand(process.env.NEXT_PUBLIC_BRAND);
