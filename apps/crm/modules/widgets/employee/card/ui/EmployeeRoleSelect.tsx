"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { ConfirmDialog } from "@workspace/ui";

import { RoleSelect, useAssignableRoles, useRoleLabel } from "@/modules/entities/access";
import { type Employee, employeeName, useUpdateEmployee } from "@/modules/entities/employee";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

/** Смена роли: выбор из ролей клуба и подтверждение — права в клубе меняются сразу. */
export function EmployeeRoleSelect({ employee }: { employee: Employee }) {
    const t = useTranslations("crm.employees.card.role");
    const update = useUpdateEmployee();
    const roles = useAssignableRoles();
    const label = useRoleLabel();
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const pendingRole = roles.find((role) => role.key === pendingKey);

    const handleConfirm = () => {
        if (!pendingKey) return;
        update.mutate(
            { id: employee.id, data: { role: pendingKey } },
            {
                onSuccess: () => {
                    toast.success(t("changed"));
                    setPendingKey(null);
                },
                onError: (error) => notifyApiError(error, t("error")),
            }
        );
    };

    return (
        <>
            <RoleSelect
                size="sm"
                className="w-auto min-w-36"
                aria-label={t("label")}
                value={employee.role.key}
                onValueChange={(key) => {
                    if (key !== employee.role.key) setPendingKey(key);
                }}
                disabled={update.isPending}
            />
            <ConfirmDialog
                open={pendingKey !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingKey(null);
                }}
                title={t("confirmTitle")}
                description={t("confirmDescription", {
                    name: employeeName(employee),
                    role: pendingRole ? label(pendingRole) : "",
                })}
                confirmLabel={update.isPending ? t("saving") : t("confirm")}
                cancelLabel={t("cancel")}
                onConfirm={handleConfirm}
                pending={update.isPending}
            />
        </>
    );
}
