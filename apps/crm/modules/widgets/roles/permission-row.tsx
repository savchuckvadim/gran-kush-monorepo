"use client";

import { useTranslations } from "next-intl";

import { Switch } from "@workspace/ui";

import type { Permission } from "@/modules/entities/access";

interface PermissionRowProps {
    permission: Permission;
    checked: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
}

/** Одно право роли: что оно даёт и тумблер. */
export function PermissionRow({ permission, checked, disabled, onChange }: PermissionRowProps) {
    const t = useTranslations("crm.access.permissions");
    const label = t(permission);

    return (
        <li className="flex items-center justify-between gap-4 px-4 py-2.5">
            <span className="min-w-0 text-sm">{label}</span>
            <Switch
                checked={checked}
                disabled={disabled}
                onCheckedChange={onChange}
                aria-label={label}
                className="shrink-0"
            />
        </li>
    );
}
