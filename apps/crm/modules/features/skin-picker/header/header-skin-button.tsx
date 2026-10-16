"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { SkinPickerSheet } from "../skin-picker-dialog";

import { SkinSwatch } from "./skin-swatch";

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
