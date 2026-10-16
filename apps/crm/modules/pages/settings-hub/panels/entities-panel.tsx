"use client";

import { useTranslations } from "next-intl";

import { Boxes, ListChecks } from "lucide-react";

import { useEntityDefinitions } from "@/modules/entities/entity-settings";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile, SettingsTileGrid } from "../settings-tile";

export function EntitiesPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const link = useLocalizedLink();
    const definitions = useEntityDefinitions();
    const active = (definitions.data ?? []).filter((item) => item.isActive !== false && item.code);

    return (
        <SettingsTileGrid>
            <SettingsTile
                icon={Boxes}
                title={t("entities.title")}
                description={t("entities.description")}
                metric={active.length}
                metricLabel={t("entities.metric")}
                items={active.map((item) => item.name ?? item.code ?? "")}
                loading={definitions.isLoading}
                href={link(ROUTES.CRM_SETTINGS_ENTITIES)}
            />
            {active.map((item) => (
                <SettingsTile
                    key={item.code}
                    icon={item.isSystem ? ListChecks : Boxes}
                    title={item.name ?? item.code ?? ""}
                    description={t("entity.description")}
                    badge={{
                        label: item.isSystem ? t("entity.system") : t("entity.custom"),
                        tone: "muted",
                    }}
                    href={link(`${ROUTES.CRM_SETTINGS_ENTITIES}/${item.code}`)}
                />
            ))}
        </SettingsTileGrid>
    );
}
