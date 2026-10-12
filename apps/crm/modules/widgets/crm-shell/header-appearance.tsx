"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Leaf } from "lucide-react";

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

/** Themes: opens the gallery. */
export function HeaderSkinButton() {
    const t = useTranslations("crm.shell.tray");
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                aria-label={t("skins")}
                title={t("skins")}
                onClick={() => setIsOpen(true)}
                className="rounded-full"
            >
                <SkinSwatch />
            </Button>
            <SkinPickerSheet open={isOpen} onOpenChange={setIsOpen} />
        </>
    );
}

/** Energy saving: animations and effects off. A theme that always saves energy locks it on. */
export function HeaderEcoToggle() {
    const t = useTranslations("crm.shell.tray");
    const { eco, setEco, isEcoActive } = useSkin();
    const ecoForced = isEcoActive && !eco;

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-pressed={isEcoActive}
            aria-label={t("eco")}
            title={ecoForced ? t("ecoForced") : t("eco")}
            disabled={ecoForced}
            onClick={() => setEco(!eco)}
            className={cn("rounded-full", isEcoActive && "text-primary")}
        >
            <Leaf />
        </Button>
    );
}
