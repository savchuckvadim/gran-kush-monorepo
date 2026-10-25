"use client";

import { useTranslations } from "next-intl";

import { Moon, Sun } from "lucide-react";

import { ICON_BUTTON } from "./icon-button";
import { useSkin } from "./use-skin";

/** Sun or moon: flips light and dark for the current palette; hidden when the palette has one mode. */
export const ModeToggle = () => {
    const t = useTranslations("skins");
    const { mode, canToggleMode, setMode } = useSkin();

    if (!canToggleMode) return null;

    const next = mode === "dark" ? "light" : "dark";

    return (
        <button
            type="button"
            onClick={() => setMode(next)}
            aria-label={t(next)}
            title={t(next)}
            className={ICON_BUTTON}
        >
            {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
};
