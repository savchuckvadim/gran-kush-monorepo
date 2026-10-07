"use client";

import * as React from "react";

import {
    getSkin,
    resolveSkin,
    type SkinDefinition,
    type SkinId,
} from "@/modules/shared/config/skins";
import {
    getSkinServerSnapshot,
    getSkinSnapshot,
    SKIN_MODE_SCRIPT,
    subscribeToSkin,
    updateSkinPreferences,
} from "@/modules/shared/lib/skin";

export interface SkinContextValue {
    skin: SkinId;
    definition: SkinDefinition;
    setSkin: (skin: SkinId) => void;
    /** The stored energy-saving preference. */
    eco: boolean;
    setEco: (eco: boolean) => void;
    /** Energy saving in effect: the preference, or a skin that always forces it. */
    isEcoActive: boolean;
}

const SkinContext = React.createContext<SkinContextValue | null>(null);

const setSkin = (skin: SkinId) => updateSkinPreferences({ skin });
const setEco = (eco: boolean) => updateSkinPreferences({ eco });

export function SkinProvider({ children }: { children: React.ReactNode }) {
    const preferences = React.useSyncExternalStore(
        subscribeToSkin,
        getSkinSnapshot,
        getSkinServerSnapshot
    );

    const value = React.useMemo<SkinContextValue>(() => {
        const definition = getSkin(resolveSkin(preferences.skin));
        return {
            skin: definition.id,
            definition,
            setSkin,
            eco: preferences.eco,
            setEco,
            isEcoActive: preferences.eco || definition.forcesEco,
        };
    }, [preferences]);

    return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
    const context = React.useContext(SkinContext);
    if (!context) {
        throw new Error("useSkin must be used inside SkinProvider");
    }
    return context;
}

/** Must be the first child of the next-themes provider, so it runs right after its script. */
export function SkinModeScript() {
    return (
        <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: SKIN_MODE_SCRIPT }} />
    );
}
