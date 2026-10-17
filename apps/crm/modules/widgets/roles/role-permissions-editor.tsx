"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button } from "@workspace/ui";

import {
    type Permission,
    type PortalRole,
    type PortalRoles,
    usePermissions,
    useRoleErrorText,
    useRoleLabel,
    useUpdatePortalRole,
} from "@/modules/entities/access";
import { DeleteRoleButton } from "@/modules/features/roles";

import { PermissionGroupCard } from "./permission-group-card";

interface RolePermissionsEditorProps {
    role: PortalRole;
    catalog: PortalRoles["catalog"];
    onDeleted: () => void;
}

const sameSet = (a: ReadonlySet<Permission>, b: readonly Permission[]) =>
    a.size === b.length && b.every((code) => a.has(code));

/**
 * Права роли тумблерами по разделам. Менять можно роль, которая не шире своих прав, и только те
 * права, что есть у самого редактора (правило API). Родитель монтирует редактор с `key` роли —
 * черновик начинается заново при выборе другой роли.
 */
export function RolePermissionsEditor({ role, catalog, onDeleted }: RolePermissionsEditorProps) {
    const t = useTranslations("crm.access.rolesPage");
    const label = useRoleLabel();
    const { permissions: mine, can } = usePermissions();
    const update = useUpdatePortalRole();
    const errorText = useRoleErrorText();
    const [draft, setDraft] = useState<ReadonlySet<Permission>>(() => new Set(role.permissions));

    const canManage = can("roles.manage");
    const editable =
        role.isEditable && canManage && role.permissions.every((code) => mine.has(code));
    const dirty = !sameSet(draft, role.permissions);

    const toggle = (permission: Permission, checked: boolean) =>
        setDraft((current) => {
            const next = new Set(current);
            if (checked) next.add(permission);
            else next.delete(permission);
            return next;
        });

    const save = () =>
        update.mutate(
            { id: role.id, body: { permissions: [...draft] } },
            {
                onSuccess: () => toast.success(t("saved")),
                onError: (error) => toast.error(errorText(error)),
            }
        );

    return (
        <section className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{label(role)}</h2>
                <div className="flex items-center gap-2">
                    {!role.isSystem && canManage && (
                        <DeleteRoleButton role={role} onDeleted={onDeleted} />
                    )}
                    {editable && (
                        <Button onClick={save} disabled={!dirty || update.isPending}>
                            {update.isPending ? t("saving") : t("save")}
                        </Button>
                    )}
                </div>
            </div>
            {!role.isEditable && <p className="text-sm text-muted-foreground">{t("fullAccess")}</p>}
            {role.isEditable && !canManage && (
                <p className="text-sm text-muted-foreground">{t("readOnly")}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
                {catalog.map((group) => (
                    <PermissionGroupCard
                        key={group.key}
                        groupKey={group.key}
                        permissions={group.permissions}
                        selected={draft}
                        isGrantable={(permission) => editable && mine.has(permission)}
                        onToggle={toggle}
                    />
                ))}
            </div>
        </section>
    );
}
