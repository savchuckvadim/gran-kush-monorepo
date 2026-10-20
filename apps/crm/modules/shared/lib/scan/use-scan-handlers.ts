"use client";

import { useEffect, useRef } from "react";

import { type ScanHandlers, scanRegistry } from "./scan-registry";

/** Обработчики кода, пока экран смонтирован; берутся свежие на каждый скан. */
export function useScanHandlers(handlers: ScanHandlers): void {
    const latest = useRef(handlers);

    useEffect(() => {
        latest.current = handlers;
    });

    useEffect(
        () =>
            scanRegistry.register({
                member: (preview) => latest.current.member?.(preview),
                product: (product) => latest.current.product?.(product),
            }),
        []
    );
}
