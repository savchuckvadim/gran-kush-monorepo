"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Palette, SwatchBook } from "lucide-react";

import { SkinPickerSheet } from "@/modules/features";
import { useSkinText } from "@/modules/features/skin-picker/use-skin-text";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { useSkin } from "@/modules/shared/providers/skin-provider";

import { SettingsTile, SettingsTileGrid } from "../settings-tile";

export function AppearancePanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const text = useSkinText();
    const { skin, definition, isEcoActive } = useSkin();
    const { resolvedTheme } = useTheme();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const mode = resolvedTheme === "dark" ? "dark" : "light";

    return (
        <>
            <SettingsTileGrid>
                <SettingsTile
                    icon={Palette}
                    title={t("appearance.title")}
                    description={t("appearance.description")}
                    metric={text.name(skin)}
                    items={[
                        text.modeName(definition, mode),
                        ...(isEcoActive ? [t("appearance.eco")] : []),
                    ]}
                    href={link(ROUTES.CRM_SETTINGS_APPEARANCE)}
                />
                <SettingsTile
                    icon={SwatchBook}
                    title={t("quickSkin.title")}
                    description={t("quickSkin.description")}
                    onClick={() => setIsPickerOpen(true)}
                />
            </SettingsTileGrid>
            <SkinPickerSheet open={isPickerOpen} onOpenChange={setIsPickerOpen} />
        </>
    );
}
