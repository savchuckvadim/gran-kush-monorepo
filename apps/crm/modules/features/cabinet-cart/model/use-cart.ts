"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import {
    type CartLine,
    type CartLines,
    getCartSnapshot,
    getServerCartSnapshot,
    subscribeCart,
    writeCart,
} from "./cart-store";

export interface Cart {
    lines: CartLines;
    quantityOf: (productId: string) => number;
    setQuantity: (productId: string, quantity: number) => void;
    remove: (productId: string) => void;
    clear: () => void;
}

/** Корзина клуба `slug`; количество 0 убирает позицию. */
export function useCart(slug: string): Cart {
    const lines = useSyncExternalStore(
        subscribeCart,
        () => getCartSnapshot(slug),
        getServerCartSnapshot
    );

    const setQuantity = useCallback(
        (productId: string, quantity: number) => {
            const current = getCartSnapshot(slug);
            const inCart = current.some((line) => line.productId === productId);
            let next: CartLine[];
            if (quantity <= 0) next = current.filter((line) => line.productId !== productId);
            else if (inCart)
                next = current.map((line) =>
                    line.productId === productId ? { productId, quantity } : line
                );
            else next = [...current, { productId, quantity }];
            writeCart(slug, next);
        },
        [slug]
    );

    return useMemo(
        () => ({
            lines,
            quantityOf: (productId: string) =>
                lines.find((line) => line.productId === productId)?.quantity ?? 0,
            setQuantity,
            remove: (productId: string) => setQuantity(productId, 0),
            clear: () => writeCart(slug, []),
        }),
        [lines, setQuantity, slug]
    );
}
