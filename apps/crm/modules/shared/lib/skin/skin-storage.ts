import { normalizeSkinId, type SkinId } from "@/modules/shared/config/skins";

/*
 * Where skin preferences live: for now this device only.
 * TASK-410 moves the club default to a Portal field and the personal choice to a user setting
 * in the API. Swap these two functions for that source; the store, the provider and the inline
 * boot script (which then needs the club default from the server) keep their shape.
 */

export const SKIN_STORAGE_KEY = "crm.skin";
export const ECO_STORAGE_KEY = "crm.eco";

export interface SkinPreferences {
    /** Personal choice; null follows the club default. */
    skin: SkinId | null;
    eco: boolean;
}

export const readSkinPreferences = (): SkinPreferences => {
    try {
        const skin = window.localStorage.getItem(SKIN_STORAGE_KEY);
        return {
            skin: normalizeSkinId(skin),
            eco: window.localStorage.getItem(ECO_STORAGE_KEY) === "1",
        };
    } catch {
        return { skin: null, eco: false };
    }
};

export const writeSkinPreferences = (preferences: SkinPreferences): void => {
    try {
        if (preferences.skin) {
            window.localStorage.setItem(SKIN_STORAGE_KEY, preferences.skin);
        } else {
            window.localStorage.removeItem(SKIN_STORAGE_KEY);
        }
        window.localStorage.setItem(ECO_STORAGE_KEY, preferences.eco ? "1" : "0");
    } catch {
        // Storage blocked (private mode, policy): the choice lasts until reload.
    }
};
