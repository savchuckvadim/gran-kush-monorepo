"use client";

import { useTranslations } from "next-intl";

import { type LucideIcon, Wallet } from "lucide-react";

import { type PortalModuleCode, usePortalModules } from "@/modules/entities/portal-modules";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile, SettingsTileGrid } from "../settings-tile";

/** Плитка модуля ведёт в его раздел: там его подключают, настраивают и отключают. */
const MODULE_TILES: Record<PortalModuleCode, { icon: LucideIcon; route: string }> = {
    finance: { icon: Wallet, route: ROUTES.CRM_FINANCE },
};

/** Подключаемые модули клуба (finance…): что включено, что можно подключить. */
export function ModulesPanel() {
    const t = useTranslations("crm.settingsHub.tiles.modules");
    const link = useLocalizedLink();
    const { data: modules, isLoading } = usePortalModules();
    const available = modules?.filter((module) => module.available) ?? [];

    return (
        <SettingsTileGrid>
            {isLoading && (
                <SettingsTile
                    icon={Wallet}
                    title={t("finance.title")}
                    description={t("finance.description")}
                    loading
                />
            )}
            {available.map((module) => {
                const tile = MODULE_TILES[module.code];
                return (
                    <SettingsTile
                        key={module.code}
                        icon={tile.icon}
                        title={t(`${module.code}.title`)}
                        description={t(`${module.code}.description`)}
                        badge={{
                            label: module.enabled ? t("on") : t("off"),
                            tone: module.enabled ? "ok" : "muted",
                        }}
                        href={link(tile.route)}
                    />
                );
            })}
        </SettingsTileGrid>
    );
}
