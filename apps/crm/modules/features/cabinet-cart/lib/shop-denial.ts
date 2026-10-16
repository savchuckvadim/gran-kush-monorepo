import { getApiErrorCode, type SchemaShopDenial } from "@workspace/api-client/core";

const DENIALS: readonly SchemaShopDenial[] = [
    "not_in_club",
    "not_approved",
    "club_subscription_inactive",
];

export const isShopDenial = (code: string | undefined): code is SchemaShopDenial =>
    DENIALS.includes(code as SchemaShopDenial);

/** Причина отказа из ответа 403 витрины или заказа, если она одна из известных. */
export const shopDenialOf = (error: unknown): SchemaShopDenial | undefined => {
    const code = getApiErrorCode(error);
    return isShopDenial(code) ? code : undefined;
};
