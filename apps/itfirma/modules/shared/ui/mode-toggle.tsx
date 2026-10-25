"use client";

import { useTranslations } from "next-intl";

import { Moon, Sun } from "lucide-react";

import { useSkin } from "./use-skin";

const BUTTON =
    "grid size-9 place-items-center rounded-full border border-border bg-card/60 text-foreground transition-colors hover:bg-accent";

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
            className={BUTTON}
        >
            {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
};
