"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import type { Permission } from "@/modules/entities/access";

import { PermissionRow } from "./permission-row";

interface PermissionGroupCardProps {
    groupKey: string;
    permissions: readonly Permission[];
    /** Права, отмеченные в роли сейчас (черновик) */
    selected: ReadonlySet<Permission>;
    /** Можно ли трогать это право: роль редактируется и право есть у самого редактора */
    isGrantable: (permission: Permission) => boolean;
    onToggle: (permission: Permission, checked: boolean) => void;
}

/** Раздел каталога прав (участники, заказы, …) карточкой с тумблерами. */
export function PermissionGroupCard({
    groupKey,
    permissions,
    selected,
    isGrantable,
    onToggle,
}: PermissionGroupCardProps) {
    const t = useTranslations("crm.access.groups");

    return (
        <Card padding="sm" className="p-0">
            <h3 className="px-4 pt-3 text-sm font-semibold">{t(groupKey)}</h3>
            <ul className="divide-y">
                {permissions.map((permission) => (
                    <PermissionRow
                        key={permission}
                        permission={permission}
                        checked={selected.has(permission)}
                        disabled={!isGrantable(permission)}
                        onChange={(checked) => onToggle(permission, checked)}
                    />
                ))}
            </ul>
        </Card>
    );
}
