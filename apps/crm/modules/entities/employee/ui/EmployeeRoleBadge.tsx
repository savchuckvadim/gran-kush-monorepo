"use client";

import { useTranslations } from "next-intl";

import { Badge, type BadgeProps } from "@workspace/ui";

import type { EmployeeRole } from "../api/employee.api";

/** Чем выше права, тем заметнее бейдж: владелец и администратор видны в списке сразу. */
const VARIANT: Readonly<Record<EmployeeRole, BadgeProps["variant"]>> = {
    portal_owner: "default",
    admin: "secondary",
    manager: "outline",
    employee: "outline",
};

export function EmployeeRoleBadge({ role }: { role: EmployeeRole }) {
    const t = useTranslations("crm.employees.roles");

    return <Badge variant={VARIANT[role]}>{t(role)}</Badge>;
}
