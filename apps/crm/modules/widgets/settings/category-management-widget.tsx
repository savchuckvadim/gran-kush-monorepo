"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import type { SchemaProductCategoryDto } from "@workspace/api-client/core";

import { useCategories } from "@/modules/entities/category";
import { usePortalRole } from "@/modules/entities/portal";
import { CreateCategoryForm } from "@/modules/features/catalog-settings";
import { EntityList, type EntityListTableColumn } from "@/modules/shared/ui/EntityList";
import { ListPage } from "@/modules/shared/ui/ListPage";

/** Категории каталога товаров в хабе настроек: список и «Создать» с формой в диалоге. */
export function CategoryManagementWidget() {
    const t = useTranslations("crm.sections.settings.categories");
    const { isAdmin } = usePortalRole();
    const { data, isPending, error } = useCategories();

    const categories = useMemo(
        () => [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
        [data]
    );
    const nameById = useMemo(
        () => new Map(categories.map((category) => [category.id, category.name])),
        [categories]
    );

    const columns: EntityListTableColumn<SchemaProductCategoryDto>[] = [
        {
            key: "name",
            header: t("columns.name"),
            cell: (category) => category.name,
            cellClassName: "font-medium",
        },
        {
            key: "code",
            header: t("columns.code"),
            cell: (category) => <span className="font-mono text-xs">{category.code}</span>,
        },
        {
            key: "parent",
            header: t("columns.parent"),
            cell: (category) =>
                (category.parentId && nameById.get(category.parentId)) || t("fields.noParent"),
        },
        {
            key: "description",
            header: t("columns.description"),
            cell: (category) => category.description || "—",
        },
    ];

    return (
        <ListPage
            variant="section"
            title={t("title")}
            description={t("description")}
            create={
                isAdmin
                    ? {
                          label: t("create"),
                          title: t("createTitle"),
                          size: "md",
                          form: ({ close }) => <CreateCategoryForm onCreated={close} />,
                      }
                    : undefined
            }
        >
            <EntityList<SchemaProductCategoryDto>
                items={categories}
                loading={isPending}
                error={error ? t("loadError") : undefined}
                emptyState={
                    <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
                }
                getRowKey={(category) => category.id}
                tableColumns={columns}
                defaultViewMode="table"
                enableViewToggle={false}
                enableVisibilitySettings={false}
                reserveFilterSpace={false}
                cardTitle={(category) => category.name}
                defaultVisibleCardFieldKeys={["parent", "description"]}
            />
        </ListPage>
    );
}
