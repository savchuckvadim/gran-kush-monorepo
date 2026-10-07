import { DEFAULT_SKIN, getForcedMode, SKINS } from "@/modules/shared/config/skins";

import { ECO_STORAGE_KEY, SKIN_STORAGE_KEY } from "./skin-storage";

const json = (value: unknown): string => JSON.stringify(value);

const storedSkins = SKINS.filter((skin) => skin.id !== DEFAULT_SKIN).map((skin) => skin.id);
const ecoSkins = SKINS.filter((skin) => skin.forcesEco).map((skin) => skin.id);
const forcedModes = Object.fromEntries(
    SKINS.flatMap((skin) => {
        const mode = getForcedMode(skin);
        return mode ? [[skin.id, mode]] : [];
    })
);

/** Root layout <head>: sets data-skin and eco before the first paint. */
export const SKIN_BOOT_SCRIPT = `(function(){try{var d=document.documentElement,s=localStorage.getItem(${json(SKIN_STORAGE_KEY)});if(${json(storedSkins)}.indexOf(s)>-1)d.setAttribute("data-skin",s);if(localStorage.getItem(${json(ECO_STORAGE_KEY)})==="1"||${json(ecoSkins)}.indexOf(s)>-1)d.classList.add("eco")}catch(e){}})()`;

/**
 * Rendered right after the next-themes script, which applies the stored light/dark before
 * React knows the skin. A one-mode skin takes the mode back until hydration hands it to
 * next-themes as forcedTheme.
 */
export const SKIN_MODE_SCRIPT = `(function(){var d=document.documentElement,m=${json(forcedModes)}[d.getAttribute("data-skin")];if(m){d.classList.remove("light","dark");d.classList.add(m);d.style.colorScheme=m}})()`;
