"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "crm.sidebar.pinned";
const CHANGE_EVENT = "crm-sidebar-pinned";

const readPinned = () => {
    try {
        return window.localStorage.getItem(STORAGE_KEY) !== "0";
    } catch {
        return true;
    }
};

const subscribe = (onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
};

/** Закреплено ли меню раскрытым на широком экране. Помнится в браузере; по умолчанию — да. */
export function useSidebarPinned() {
    // The server renders the pinned (most common) layout, so desktop loads without a jump.
    const pinned = useSyncExternalStore(subscribe, readPinned, () => true);

    const setPinned = useCallback((value: boolean) => {
        try {
            window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
        } catch {
            // private mode: the choice lasts until reload
        }
        window.dispatchEvent(new Event(CHANGE_EVENT));
    }, []);

    return [pinned, setPinned] as const;
}
