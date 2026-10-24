"use client";

import { useTranslations } from "next-intl";

import { Moon, Sun } from "lucide-react";

import { useSkin } from "./use-skin";

/** Light / dark for skins that have both; hidden for a single-mode skin such as Black. */
export const ModeSwitch = () => {
    const t = useTranslations("skins");
    const { mode, canToggleMode, setMode } = useSkin();

    if (!canToggleMode) return null;

    const next = mode === "dark" ? "light" : "dark";

    return (
        <button
            type="button"
            onClick={() => setMode(next)}
            aria-label={t(next === "dark" ? "toDark" : "toLight")}
            title={t(next === "dark" ? "toDark" : "toLight")}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
            {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
    );
};
