"use client";

import { useCallback, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export type OrdersView = "list" | "kanban";

const VIEW_PARAM = "view";
const FUNNEL_PARAM = "funnel";
const STORAGE_KEY = "crm.orders.view";

const isOrdersView = (value: string | null): value is OrdersView =>
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

const readStoredView = (): OrdersView | null => {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        return isOrdersView(stored) ? stored : null;
    } catch {
        return null;
    }
};

const storeView = (view: OrdersView): void => {
    try {
        window.localStorage.setItem(STORAGE_KEY, view);
    } catch {
        // storage blocked: the choice lives in the address only
    }
    listeners.forEach((listener) => listener());
};

const noStoredView = (): OrdersView | null => null;

/**
 * View (list / kanban) and funnel in the address, so a link opens the same screen; without
 * `?view=` the last choice on this device. Written with replaceState, like the filter.
 */
export function useOrdersView() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const stored = useSyncExternalStore(subscribe, readStoredView, noStoredView);

    const fromUrl = searchParams.get(VIEW_PARAM);
    const view: OrdersView = isOrdersView(fromUrl) ? fromUrl : (stored ?? "list");
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
        (next: OrdersView) => {
            storeView(next);
            writeParam(VIEW_PARAM, next);
        },
        [writeParam]
    );

    const setFunnelId = useCallback((next: string) => writeParam(FUNNEL_PARAM, next), [writeParam]);

    return { view, setView, funnelId, setFunnelId };
}
