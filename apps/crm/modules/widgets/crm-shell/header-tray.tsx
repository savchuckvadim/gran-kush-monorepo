"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronLeft, Leaf } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { SkinPickerSheet } from "@/modules/features";
import { useSkin } from "@/modules/shared/providers/skin-provider";

/** Swatch of the current theme's colours: the "themes" button looks like the theme itself. */
function SkinSwatch() {
    return (
        <span
            aria-hidden="true"
            className="size-[1.125rem] rounded-full ring-1 ring-border"
            style={{
                background:
                    "conic-gradient(from 200deg, var(--primary), var(--chart-2, var(--accent)), var(--chart-4, var(--secondary)), var(--primary))",
            }}
        />
    );
}

/**
 * Выдвижной лоток в шапке: стрелка (при наведении смотрит влево) открывает ряд иконок —
 * темы оформления и энергосбережение; сюда же можно добавлять другие быстрые действия.
 */
export function HeaderTray() {
    const t = useTranslations("crm.shell.tray");
    const { eco, setEco, isEcoActive } = useSkin();
    const [isOpen, setIsOpen] = useState(false);
    const [isSkinsOpen, setIsSkinsOpen] = useState(false);
    // A theme that always saves energy keeps it on regardless of the preference.
    const ecoForced = isEcoActive && !eco;

    return (
        <div className="hidden items-center sm:flex">
            <div
                id="header-tray"
                aria-hidden={!isOpen}
                className={cn(
                    "flex items-center gap-0.5 overflow-hidden transition-[max-width,opacity] duration-300 ease-out",
                    isOpen ? "max-w-40 opacity-100" : "pointer-events-none max-w-0 opacity-0"
                )}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    tabIndex={isOpen ? 0 : -1}
                    aria-label={t("skins")}
                    title={t("skins")}
                    onClick={() => setIsSkinsOpen(true)}
                    className="rounded-full"
                >
                    <SkinSwatch />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    tabIndex={isOpen ? 0 : -1}
                    aria-pressed={isEcoActive}
                    aria-label={t("eco")}
                    title={ecoForced ? t("ecoForced") : t("eco")}
                    disabled={ecoForced}
                    onClick={() => setEco(!eco)}
                    className={cn("rounded-full", isEcoActive && "text-primary")}
                >
                    <Leaf />
                </Button>
            </div>

            <Button
                variant="ghost"
                size="icon-sm"
                aria-expanded={isOpen}
                aria-controls="header-tray"
                aria-label={isOpen ? t("close") : t("open")}
                title={isOpen ? t("close") : t("open")}
                onClick={() => setIsOpen((value) => !value)}
                className="group text-muted-foreground rounded-full"
            >
                <ChevronLeft
                    className={cn(
                        "transition-transform duration-300",
                        isOpen ? "rotate-180" : "-rotate-90 group-hover:rotate-0"
                    )}
                />
            </Button>

            <SkinPickerSheet open={isSkinsOpen} onOpenChange={setIsSkinsOpen} />
        </div>
    );
}
