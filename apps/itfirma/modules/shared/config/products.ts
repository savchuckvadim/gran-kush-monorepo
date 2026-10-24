import { type BrandCode, BRANDS } from "@workspace/brand";

export const PRODUCT_KEYS = ["inkspace", "plisplas", "bitrix"] as const;

export type ProductKey = (typeof PRODUCT_KEYS)[number];

export interface Product {
    /** Texts: `products.items.<key>`. */
    key: ProductKey;
    palette: readonly string[];
    /** Public address; none — the card shows `items.<key>.status`. */
    url: string | null;
}

/** Clean installations only: the club product stays apart from the studio (multi-niche rule). */
const brandProduct = (code: BrandCode & ProductKey): Product => ({
    key: code,
    palette: BRANDS[code].palette,
    url: `https://${BRANDS[code].domains.site}`,
});

const PRODUCTS: Record<ProductKey, Product> = {
    inkspace: brandProduct("inkspace"),
    plisplas: brandProduct("plisplas"),
    bitrix: { key: "bitrix", palette: ["#2f54eb", "#00b8d9"], url: null },
};

/**
 * Products shown on the site, in this order. A product goes here once its public site is live;
 * while the list is empty the section and its menu item are hidden.
 */
const LIVE_PRODUCTS: readonly ProductKey[] = [];

export const SHOWN_PRODUCTS: readonly Product[] = LIVE_PRODUCTS.map((key) => PRODUCTS[key]);

export const HAS_PRODUCTS = SHOWN_PRODUCTS.length > 0;
