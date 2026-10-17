"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { type PortalRole, useRoleLabel } from "@/modules/entities/access";

interface RoleListItemProps {
    role: PortalRole;
    selected: boolean;
    onSelect: () => void;
}

export function RoleListItem({ role, selected, onSelect }: RoleListItemProps) {
    const t = useTranslations("crm.access.rolesPage");
    const label = useRoleLabel();

    return (
        <button
            type="button"
            aria-pressed={selected}
            onClick={onSelect}
            className={cn(
                "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                selected ? "bg-primary/10 text-primary" : "hover:bg-accent"
            )}
        >
            <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{label(role)}</span>
                <span className="block text-xs text-muted-foreground">
                    {t("employees", { count: role.employeeCount })}
                </span>
            </span>
            {!role.isSystem && <Badge variant="outline">{t("custom")}</Badge>}
        </button>
    );
}
