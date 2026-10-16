import type { SchemaShopDenial } from "@workspace/api-client/core";

/*
 * Коды отказов витрины и заказа, которые кабинет объясняет своими словами. Сообщение API — для
 * журнала и не переведено, поэтому участнику показываем текст по коду.
 */

const SHOP_DENIALS: readonly SchemaShopDenial[] = [
    "not_in_club",
    "not_approved",
    "club_subscription_inactive",
];

/** Отказы оформления по составу корзины (`CABINET_ORDER_ERRORS`, `MONTHLY_LIMIT_EXCEEDED` в API). */
export type CartErrorCode = "product_unavailable" | "insufficient_stock" | "monthly_limit_exceeded";

const CART_ERRORS: readonly CartErrorCode[] = [
    "product_unavailable",
    "insufficient_stock",
    "monthly_limit_exceeded",
];

export const isShopDenial = (code: string | undefined): code is SchemaShopDenial =>
    SHOP_DENIALS.includes(code as SchemaShopDenial);

export const isCartError = (code: string | undefined): code is CartErrorCode =>
    CART_ERRORS.includes(code as CartErrorCode);
