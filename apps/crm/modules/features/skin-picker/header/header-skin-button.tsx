"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { SkinPickerSheet } from "../skin-picker-sheet";

import { SkinSwatch } from "./skin-swatch";

/** Themes: opens the gallery. */
export function HeaderSkinButton({ className }: { className?: string }) {
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
                className={cn("rounded-full", className)}
            >
                <SkinSwatch />
            </Button>
            <SkinPickerSheet open={isOpen} onOpenChange={setIsOpen} />
        </>
    );
}
