"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { SchemaMeasurementUnitDto } from "@workspace/api-client/core";
import { Badge } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { useMeasurementUnits } from "@/modules/entities/measurement-unit";
import { CreateMeasurementUnitForm, UnitWeighedSwitch } from "@/modules/features/catalog-settings";
import { EntityList, type EntityListTableColumn } from "@/modules/shared/ui/EntityList";
import { ListPage } from "@/modules/shared/ui/ListPage";

/** Единицы измерения в хабе настроек: встроенные и свои, «Создать» с формой в диалоге. */
export function MeasurementUnitManagementWidget() {
    const t = useTranslations("crm.sections.settings.measurementUnits");
    const { can } = usePermissions();
    const canManage = can("catalog.manage");
    const { data, isPending, error } = useMeasurementUnits();

    const units = useMemo(
        () => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [data]
    );

    const columns: EntityListTableColumn<SchemaMeasurementUnitDto>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (unit) => unit.name,
            cellClassName: "font-medium",
        },
        {
            key: "code",
            header: t("columns.code"),
            cell: (unit) => <span className="font-mono text-xs">{unit.code}</span>,
        },
        {
            key: "kind",
            header: t("columns.kind"),
            cell: (unit) => (
                <Badge variant={unit.isCustom ? "outline" : "secondary"}>
                    {unit.isCustom ? t("custom") : t("builtIn")}
                </Badge>
            ),
        },
        {
            key: "weighed",
            header: t("columns.weighed"),
            cell: (unit) =>
                canManage ? <UnitWeighedSwitch unit={unit} /> : unit.isWeighed ? t("weighed") : "—",
        },
    ];

    return (
        <ListPage
            variant="section"
            title={t("title")}
            description={t("description")}
            create={
                canManage
                    ? {
                          label: t("create"),
                          title: t("createTitle"),
                          size: "md",
                          form: ({ close }) => <CreateMeasurementUnitForm onCreated={close} />,
                      }
                    : undefined
            }
        >
            <EntityList<SchemaMeasurementUnitDto>
                items={units}
                loading={isPending}
                error={error ? t("loadError") : undefined}
                emptyState={
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
                }
                getRowKey={(unit) => unit.id}
                tableColumns={columns}
                defaultViewMode="table"
                enableViewToggle={false}
                enableVisibilitySettings={false}
                reserveFilterSpace={false}
                cardTitle={(unit) => unit.name}
                defaultVisibleCardFieldKeys={["code", "kind", "weighed"]}
            />
        </ListPage>
    );
}
