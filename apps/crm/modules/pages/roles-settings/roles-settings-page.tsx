"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { usePermissions, usePortalRoles } from "@/modules/entities/access";
import { CreateRoleForm } from "@/modules/features/roles";
import { ListPage } from "@/modules/shared/ui/ListPage";
import { RoleListItem, RolePermissionsEditor } from "@/modules/widgets/roles";

/** «Настройки → Роли и права»: роли клуба слева, права выбранной — справа (на телефоне — под списком). */
export function RolesSettingsPage() {
    const t = useTranslations("crm.access.rolesPage");
    const { can } = usePermissions();
    const roles = usePortalRoles();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const list = roles.data?.roles ?? [];
    const selected = list.find((role) => role.id === selectedId) ?? list[0];

    return (
        <ListPage
            title={t("title")}
            description={t("description")}
            create={
                can("roles.manage")
                    ? {
                          label: t("create"),
                          title: t("create"),
                          description: t("createDescription"),
                          size: "sm",
                          form: ({ close }) => (
                              <CreateRoleForm
                                  onCreated={(role) => {
                                      setSelectedId(role.id);
                                      close();
                                  }}
                              />
                          ),
                      }
                    : undefined
            }
        >
            {roles.isLoading || !roles.data || !selected ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
                    <nav aria-label={t("title")} className="space-y-1">
                        {list.map((role) => (
                            <RoleListItem
                                key={role.id}
                                role={role}
                                selected={role.id === selected.id}
                                onSelect={() => setSelectedId(role.id)}
                            />
                        ))}
                    </nav>
                    <RolePermissionsEditor
                        key={`${selected.id}:${selected.permissions.join(",")}`}
                        role={selected}
                        catalog={roles.data.catalog}
                        onDeleted={() => setSelectedId(null)}
                    />
                </div>
            )}
        </ListPage>
    );
}
