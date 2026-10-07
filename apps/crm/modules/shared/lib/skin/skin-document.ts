import { DEFAULT_SKIN, getSkin, resolveSkin } from "@/modules/shared/config/skins";

import type { SkinPreferences } from "./skin-storage";

const TRANSITIONS_OFF = "*,*::before,*::after{transition:none!important}";

// Same trick next-themes uses: without it every transition-colors element animates the swap.
const suspendTransitions = (): (() => void) => {
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(TRANSITIONS_OFF));
    document.head.appendChild(style);
    return () => {
        window.getComputedStyle(document.body);
        window.setTimeout(() => style.remove(), 1);
    };
};

/** Light/dark is not set here: next-themes applies it from `forcedTheme`. */
export const applySkinToDocument = (preferences: SkinPreferences): void => {
    const skin = getSkin(resolveSkin(preferences.skin));
    const root = document.documentElement;
    const resume = suspendTransitions();

    if (skin.id === DEFAULT_SKIN) {
        root.removeAttribute("data-skin");
    } else {
        root.setAttribute("data-skin", skin.id);
    }
    root.classList.toggle("eco", preferences.eco || skin.forcesEco);

    resume();
};
