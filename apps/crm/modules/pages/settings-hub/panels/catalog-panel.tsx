"use client";

import { useTranslations } from "next-intl";

import { FolderTree, Ruler } from "lucide-react";

import { useCategories } from "@/modules/entities/category";
import { useMeasurementUnits } from "@/modules/entities/measurement-unit";
import {
    CategoryManagementWidget,
    MeasurementUnitManagementWidget,
} from "@/modules/widgets/settings";

import { SettingsTile, SettingsTileGrid } from "../settings-tile";

const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function CatalogPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const categories = useCategories();
    const units = useMeasurementUnits();

    return (
        <div className="space-y-6">
            <SettingsTileGrid>
                <SettingsTile
                    icon={FolderTree}
                    title={t("categories.title")}
                    description={t("categories.description")}
                    metric={categories.data?.length ?? 0}
                    metricLabel={t("categories.metric")}
                    items={(categories.data ?? []).map((category) => category.name)}
                    loading={categories.isLoading}
                    onClick={() => scrollTo("settings-categories")}
                />
                <SettingsTile
                    icon={Ruler}
                    title={t("units.title")}
                    description={t("units.description")}
                    metric={units.data?.length ?? 0}
                    metricLabel={t("units.metric")}
                    items={(units.data ?? []).map((unit) => unit.name)}
                    loading={units.isLoading}
                    onClick={() => scrollTo("settings-units")}
                />
            </SettingsTileGrid>
            <div id="settings-categories" className="scroll-mt-20">
                <CategoryManagementWidget />
            </div>
            <div id="settings-units" className="scroll-mt-20">
                <MeasurementUnitManagementWidget />
            </div>
        </div>
    );
}
