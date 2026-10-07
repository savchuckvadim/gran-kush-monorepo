"use client";

import { useId } from "react";
import { useTheme } from "next-themes";

import { Label, Switch } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { getEffectiveMode, type SkinMode } from "@/modules/shared/config/skins";
import { useSkin } from "@/modules/shared/providers/skin-provider";

import { usePreferredMode } from "./use-preferred-mode";
import { useSkinText } from "./use-skin-text";

const MODES: readonly SkinMode[] = ["light", "dark"];

/** Light/dark for the current skin and energy saving. */
export function SkinOptions({ className }: { className?: string }) {
    const text = useSkinText();
    const ecoId = useId();
    const { definition, setEco, isEcoActive } = useSkin();
    const { setTheme } = useTheme();
    const currentMode = getEffectiveMode(definition, usePreferredMode());
    const hasOneMode = definition.modes.length === 1;

    return (
        <div className={cn("divide-y divide-border", className)}>
            <div className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                    <p className="text-sm font-medium">{text.t("mode.title")}</p>
                    <p className="text-xs text-muted-foreground">
                        {hasOneMode ? text.t("mode.single") : text.t("mode.both")}
                    </p>
                </div>
                <div
                    role="group"
                    aria-label={text.t("mode.title")}
                    className="inline-flex gap-1 rounded-lg bg-muted p-1"
                >
                    {MODES.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            aria-pressed={currentMode === mode}
                            disabled={hasOneMode}
                            onClick={() => setTheme(mode)}
                            className="h-7 cursor-pointer rounded-md px-3 text-xs font-semibold whitespace-nowrap text-muted-foreground transition-colors aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {text.modeName(definition, mode)}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                    <Label htmlFor={ecoId}>{text.t("eco.title")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {definition.forcesEco ? text.t("eco.forced") : text.t("eco.hint")}
                    </p>
                </div>
                <Switch
                    id={ecoId}
                    checked={isEcoActive}
                    disabled={definition.forcesEco}
                    onCheckedChange={setEco}
                />
            </div>
        </div>
    );
}
