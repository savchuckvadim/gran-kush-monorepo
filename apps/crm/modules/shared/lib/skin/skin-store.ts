import type { SkinId } from "@/modules/shared/config/skins";

import { applySkinToDocument } from "./skin-document";
import {
    ECO_STORAGE_KEY,
    readSkinPreferences,
    SKIN_STORAGE_KEY,
    type SkinPreferences,
    writeSkinPreferences,
} from "./skin-storage";

/*
 * External store for useSyncExternalStore: the server renders the default skin, the client
 * switches to the stored one right after hydration. The DOM already shows it by then, because
 * the boot script set data-skin before the first paint.
 *
 * The club's default skin (decision 10) is known only after the club's data loads, so it lives
 * here in memory: the page that knows the club sets it, and a personal choice still wins.
 */

export interface SkinState extends SkinPreferences {
    /** The club's default skin; `null` — the PafPaf default. */
    clubDefault: SkinId | null;
}

const SERVER_SNAPSHOT: SkinState = { skin: null, eco: false, clubDefault: null };

let snapshot: SkinState | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const current = (): SkinState => {
    snapshot ??= { ...readSkinPreferences(), clubDefault: null };
    return snapshot;
};

const commit = (next: SkinState) => {
    snapshot = next;
    applySkinToDocument(next, next.clubDefault);
    emit();
};

const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SKIN_STORAGE_KEY && event.key !== ECO_STORAGE_KEY) {
        return;
    }
    commit({ ...readSkinPreferences(), clubDefault: current().clubDefault });
};

export const subscribeToSkin = (listener: () => void): (() => void) => {
    listeners.add(listener);
    if (listeners.size === 1) {
        window.addEventListener("storage", handleStorage);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
            window.removeEventListener("storage", handleStorage);
        }
    };
};

export const getSkinSnapshot = (): SkinState => current();

export const getSkinServerSnapshot = (): SkinState => SERVER_SNAPSHOT;

export const updateSkinPreferences = (patch: Partial<SkinPreferences>): void => {
    const next = { ...current(), ...patch };
    writeSkinPreferences({ skin: next.skin, eco: next.eco });
    commit(next);
};

/** The club's default skin for the page that shows a club; `null` when it leaves the club. */
export const setClubDefaultSkin = (skin: SkinId | null): void => {
    if (current().clubDefault === skin) return;
    commit({ ...current(), clubDefault: skin });
};
