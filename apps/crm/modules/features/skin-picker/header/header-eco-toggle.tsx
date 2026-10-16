"use client";

import { useTranslations } from "next-intl";

import { Leaf } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useSkin } from "@/modules/shared/providers/skin-provider";

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
