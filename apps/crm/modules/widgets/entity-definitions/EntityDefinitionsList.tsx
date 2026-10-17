"use client";

import { useMemo } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Settings2 } from "lucide-react";

import { Badge, Button } from "@workspace/ui";

import { useEntityDefinitions } from "@/modules/entities/entity-settings";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { EntityList, type EntityListTableColumn } from "@/modules/shared/ui/EntityList";

import {
    type EntityDefinitionRow,
    SYSTEM_ENTITY_CODES,
    toEntityDefinitionRows,
} from "./entity-definition-row";

/** Системные и свои сущности клуба; строка открывает настройку полей, форм и стадий. */
export function EntityDefinitionsList() {
    const t = useTranslations("crm.entitiesSettings");
    const router = useRouter();
    const toAppPath = useLocalizedLink();
    const { data, isPending, error } = useEntityDefinitions();

    const rows = useMemo<EntityDefinitionRow[]>(() => {
        const loaded = toEntityDefinitionRows(data ?? []);
        if (!data || loaded.length > 0) return loaded;
        return SYSTEM_ENTITY_CODES.map((code) => ({
            code,
            name: t(`systemNames.${code}`),
            isSystem: true,
        }));
    }, [data, t]);

    const settingsPath = (row: EntityDefinitionRow) =>
        toAppPath(`${ROUTES.CRM_SETTINGS_ENTITIES}/${row.code}`);

    const columns: EntityListTableColumn<EntityDefinitionRow>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (row) => (
                <NextLink
                    href={settingsPath(row)}
                    className="font-medium hover:underline"
                    // строка и сама ведёт туда же: клик по ссылке не должен переходить дважды
                    onClick={(event) => event.stopPropagation()}
                >
                    {row.name || row.code}
                </NextLink>
            ),
        },
        {
            key: "code",
            header: t("columns.code"),
            cell: (row) => <span className="font-mono text-xs">{row.code}</span>,
        },
        {
            key: "kind",
            header: t("columns.kind"),
            cell: (row) => (
                <Badge variant={row.isSystem ? "secondary" : "outline"}>
                    {row.isSystem ? t("system") : t("custom")}
                </Badge>
            ),
        },
    ];

    return (
        <EntityList<EntityDefinitionRow>
            items={rows}
            loading={isPending}
            error={error ? t("loadError") : undefined}
            getRowKey={(row) => row.code}
            tableColumns={columns}
            defaultViewMode="table"
            viewModeStorageKey="crm-entity-definitions"
            reserveFilterSpace={false}
            isRowClickable
            onRowClick={(row) => router.push(settingsPath(row))}
            cardTitle={(row) => row.name || row.code}
            defaultVisibleCardFieldKeys={["code", "kind"]}
            isCardClickable
            onCardClick={(row) => router.push(settingsPath(row))}
            renderRowActions={(row) => (
                <Button variant="outline" size="sm" asChild>
                    <NextLink href={settingsPath(row)}>
                        <Settings2 className="size-4" aria-hidden="true" />
                        {t("configure")}
                    </NextLink>
                </Button>
            )}
        />
    );
}
