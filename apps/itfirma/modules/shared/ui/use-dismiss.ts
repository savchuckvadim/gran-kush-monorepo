"use client";

import { type RefObject, useEffect } from "react";

/**
 * Closes an open popover or panel on Escape and on a press outside every element in `refs` (the
 * button and, for a panel rendered in a portal, the panel itself); the header menus share it.
 */
export const useDismiss = (
    open: boolean,
    close: () => void,
    refs: readonly RefObject<HTMLElement | null>[]
) => {
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (!refs.some((ref) => ref.current?.contains(target))) close();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };
        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open, close, refs]);
};
