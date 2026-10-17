"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui";

/** Есть ли у сотрудника доступ к CRM клуба. */
export function EmployeeStatusBadge({ isActive }: { isActive: boolean }) {
    const t = useTranslations("crm.employees.status");

    return (
        <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? t("active") : t("inactive")}
        </Badge>
    );
}
