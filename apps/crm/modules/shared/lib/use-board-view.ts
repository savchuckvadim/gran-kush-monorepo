"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type BoardView = "list" | "kanban";

const VIEW_PARAM = "view";
const FUNNEL_PARAM = "funnel";

const isBoardView = (value: string | null): value is BoardView =>
    value === "list" || value === "kanban";

/* The last view picked on this device: an external store, so the server render (no storage)
   and the browser agree on the first paint and switch right after hydration. */

const listeners = new Set<() => void>();

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
};

const readStoredView = (storageKey: string): BoardView | null => {
    try {
        const stored = window.localStorage.getItem(storageKey);
        return isBoardView(stored) ? stored : null;
    } catch {
        return null;
    }
};

const storeView = (storageKey: string, view: BoardView): void => {
    try {
        window.localStorage.setItem(storageKey, view);
    } catch {
        // storage blocked: the choice lives in the address only
    }
    listeners.forEach((listener) => listener());
};

const noStoredView = (): BoardView | null => null;

/**
 * View (list / kanban) and funnel of a board in the address, so a link opens the same screen;
 * without `?view=` — the last choice on this device under `storageKey`. Written with
 * replaceState, like the filter.
 */
export function useBoardView(storageKey: string) {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const stored = useSyncExternalStore(subscribe, () => readStoredView(storageKey), noStoredView);

    const fromUrl = searchParams.get(VIEW_PARAM);
    const view: BoardView = isBoardView(fromUrl) ? fromUrl : (stored ?? "list");
    const funnelId = searchParams.get(FUNNEL_PARAM);

    const writeParam = useCallback(
        (name: string, value: string) => {
            const params = new URLSearchParams(searchParams);
            params.set(name, value);
            // the list page belongs to one view: switching starts from the first page
            params.delete("page");
            window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
        },
        [pathname, searchParams]
    );

    const setView = useCallback(
        (next: BoardView) => {
            storeView(storageKey, next);
            writeParam(VIEW_PARAM, next);
        },
        [storageKey, writeParam]
    );

    const setFunnelId = useCallback((next: string) => writeParam(FUNNEL_PARAM, next), [writeParam]);

    return { view, setView, funnelId, setFunnelId };
}
