import { BASE_SKIN, DEFAULT_SKIN, getForcedMode, SKINS } from "@/modules/shared/config/skins";

import { ECO_STORAGE_KEY, SKIN_STORAGE_KEY } from "./skin-storage";

const json = (value: unknown): string => JSON.stringify(value);

const skinIds = SKINS.map((skin) => skin.id);
const ecoSkins = SKINS.filter((skin) => skin.forcesEco).map((skin) => skin.id);
const forcedModes = Object.fromEntries(
    SKINS.flatMap((skin) => {
        const mode = getForcedMode(skin);
        return mode ? [[skin.id, mode]] : [];
    })
);

/**
 * Root layout <head>: sets data-skin and eco before the first paint. No stored choice means the
 * default skin; Clásico (the base tokens) is the one rendered without the attribute.
 */
export const SKIN_BOOT_SCRIPT = `(function(){var d=document.documentElement,s=${json(DEFAULT_SKIN)};try{var v=localStorage.getItem(${json(SKIN_STORAGE_KEY)});if(${json(skinIds)}.indexOf(v)>-1)s=v;if(localStorage.getItem(${json(ECO_STORAGE_KEY)})==="1")d.classList.add("eco")}catch(e){}if(s!==${json(BASE_SKIN)})d.setAttribute("data-skin",s);if(${json(ecoSkins)}.indexOf(s)>-1)d.classList.add("eco")})()`;

/**
 * Rendered right after the next-themes script, which applies the stored light/dark before
 * React knows the skin. A one-mode skin takes the mode back until hydration hands it to
 * next-themes as forcedTheme.
 */
export const SKIN_MODE_SCRIPT = `(function(){var d=document.documentElement,m=${json(forcedModes)}[d.getAttribute("data-skin")];if(m){d.classList.remove("light","dark");d.classList.add(m);d.style.colorScheme=m}})()`;
