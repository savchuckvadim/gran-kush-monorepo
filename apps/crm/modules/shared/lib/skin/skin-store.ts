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
 */

const SERVER_SNAPSHOT: SkinPreferences = { skin: null, eco: false };

let snapshot: SkinPreferences | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== SKIN_STORAGE_KEY && event.key !== ECO_STORAGE_KEY) {
        return;
    }
    snapshot = readSkinPreferences();
    applySkinToDocument(snapshot);
    emit();
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

export const getSkinSnapshot = (): SkinPreferences => {
    snapshot ??= readSkinPreferences();
    return snapshot;
};

export const getSkinServerSnapshot = (): SkinPreferences => SERVER_SNAPSHOT;

export const updateSkinPreferences = (patch: Partial<SkinPreferences>): void => {
    snapshot = { ...getSkinSnapshot(), ...patch };
    writeSkinPreferences(snapshot);
    applySkinToDocument(snapshot);
    emit();
};
