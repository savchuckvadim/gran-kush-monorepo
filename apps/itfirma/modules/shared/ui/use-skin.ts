"use client";

import { useCallback, useEffect, useState } from "react";

import {
    DEFAULT_SKIN,
    getEffectiveMode,
    getSkin,
    isSkinId,
    MODE_KEY,
    SKIN_EVENT,
    SKIN_KEY,
    type SkinId,
    type SkinMode,
} from "@/modules/shared/config/skins";

interface SkinState {
    skin: SkinId;
    mode: SkinMode;
}

const readState = (): SkinState => {
    const root = document.documentElement;
    const skin = root.getAttribute("data-skin");
    return {
        skin: isSkinId(skin) ? skin : DEFAULT_SKIN,
        mode: root.classList.contains("dark") ? "dark" : "light",
    };
};

const persist = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // private mode or blocked storage: the choice lives until reload
    }
};

/** Writes the look to <html> and storage; the same rules as SKIN_SCRIPT runs before paint. */
const applySkin = (skin: SkinId, preferred: SkinMode) => {
    const mode = getEffectiveMode(getSkin(skin), preferred);
    const root = document.documentElement;
    root.setAttribute("data-skin", skin);
    root.classList.toggle("dark", mode === "dark");
    persist(SKIN_KEY, skin);
    persist(MODE_KEY, mode);
    window.dispatchEvent(new Event(SKIN_EVENT));
};

const readStored = (key: string): string | null => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

/**
 * Re-applies the saved look. SKIN_SCRIPT sets it before paint, but a page React renders on the
 * client (a not-found under a dynamic route) writes the <html> attributes from props again.
 */
export const restoreSkin = () => {
    const stored = readStored(SKIN_KEY);
    const skin = isSkinId(stored) ? stored : DEFAULT_SKIN;
    const mode = readStored(MODE_KEY);
    applySkin(skin, mode === "light" || mode === "dark" ? mode : getSkin(skin).modes[0]);
};

/** The current look and the two ways to change it; every switch on the page stays in sync. */
export const useSkin = () => {
    const [state, setState] = useState<SkinState>({ skin: DEFAULT_SKIN, mode: "dark" });

    useEffect(() => {
        const sync = () => setState(readState());
        sync();
        window.addEventListener(SKIN_EVENT, sync);
        return () => window.removeEventListener(SKIN_EVENT, sync);
    }, []);

    const setSkin = useCallback((skin: SkinId) => applySkin(skin, readState().mode), []);

    const setMode = useCallback((mode: SkinMode) => applySkin(readState().skin, mode), []);

    const definition = getSkin(state.skin);

    return { ...state, definition, canToggleMode: definition.modes.length === 2, setSkin, setMode };
};
