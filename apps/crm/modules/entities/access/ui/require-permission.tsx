"use client";

import { useTranslations } from "next-intl";

import type { ReactNode } from "react";

import { StatusCard } from "@/modules/shared/ui/StatusCard";

import type { Permission } from "../api";
import { usePermissions } from "../hooks";

interface RequirePermissionProps {
    /** Достаточно любого из прав; раздел, где нужны все, перечисляет их в `allOf` */
    anyOf?: readonly Permission[];
    allOf?: readonly Permission[];
    children: ReactNode;
}

/**
 * Раздел только для тех, у чьей роли есть права: остальным — «Нет доступа» вместо страницы, которая
 * ловила бы 403 из каждого запроса. API проверяет права ещё раз.
 */
export function RequirePermission({ anyOf, allOf, children }: RequirePermissionProps) {
    const t = useTranslations("crm.access.noAccess");
    const { role, can } = usePermissions();

    // Пока не знаем роль в клубе, не показываем ни страницу, ни отказ
    if (!role) return null;

    const allowed =
        (!anyOf || anyOf.some((code) => can(code))) && (!allOf || allOf.every((code) => can(code)));
    return allowed ? children : <StatusCard title={t("title")} text={t("description")} />;
}
