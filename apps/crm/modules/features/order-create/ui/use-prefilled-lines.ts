"use client";

import { useMemo } from "react";

import { useProductDetail } from "@/modules/entities/product";

import {
    addScannedLine,
    type OrderDraftLine,
    scanRefusal,
    toDraftProduct,
} from "../model/order-draft";

const NO_LINES: OrderDraftLine[] = [];

/** «Новый заказ» с карточки товара или из сканера: черновик начинается с этого товара. */
export function usePrefilledLines(productId?: string): OrderDraftLine[] {
    const product = useProductDetail(productId ?? null);
    return useMemo(
        () =>
            product.data && !scanRefusal(product.data)
                ? addScannedLine(NO_LINES, toDraftProduct(product.data))
                : NO_LINES,
        [product.data]
    );
}
