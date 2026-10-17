"use client";

import { useTranslations } from "next-intl";

import { usePermissions } from "@/modules/entities/access";
import { CreateEntityDefinitionForm } from "@/modules/features/entity-definitions";
import { ListPage } from "@/modules/shared/ui/ListPage";
import { EntityDefinitionsList } from "@/modules/widgets/entity-definitions";

export function EntitiesSettingsPage() {
    const t = useTranslations("crm.entitiesSettings");
    const { can } = usePermissions();
    const canEdit = can("settings.structure");

    return (
        <ListPage
            title={t("title")}
            description={t("subtitle")}
            create={
                canEdit
                    ? {
                          label: t("create.button"),
                          title: t("create.title"),
                          size: "md",
                          form: ({ close }) => <CreateEntityDefinitionForm onCreated={close} />,
                      }
                    : undefined
            }
        >
            <EntityDefinitionsList />
        </ListPage>
    );
}
