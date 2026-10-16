"use client";

import { useTranslations } from "next-intl";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";

import { isCartError, isShopDenial } from "./order-error-codes";

/** Текст отказа оформления: известные коды — своими словами, остальное — сообщением API. */
export function usePlaceOrderErrorText(): (error: unknown) => string | null {
    const tDenial = useTranslations("cabinet.shop.denial");
    const tCart = useTranslations("cabinet.shop.cart.errors");

    return (error) => {
        if (!error) return null;
        const code = getApiErrorCode(error);
        if (isShopDenial(code)) return tDenial(code);
        if (isCartError(code)) return tCart(code);
        return getApiErrorMessage(error);
    };
}
