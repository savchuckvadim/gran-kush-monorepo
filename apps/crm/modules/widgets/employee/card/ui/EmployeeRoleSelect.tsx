"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { ConfirmDialog, FieldSelect } from "@workspace/ui";

import {
    ASSIGNABLE_EMPLOYEE_ROLES,
    type AssignableEmployeeRole,
    type Employee,
    employeeName,
    isAssignableEmployeeRole,
    useUpdateEmployee,
} from "@/modules/entities/employee";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

/** Смена роли: выбор в списке и подтверждение — права в клубе меняются сразу. */
export function EmployeeRoleSelect({ employee }: { employee: Employee }) {
    const t = useTranslations("crm.employees.card.role");
    const tRoles = useTranslations("crm.employees.roles");
    const update = useUpdateEmployee();
    const [pendingRole, setPendingRole] = useState<AssignableEmployeeRole | null>(null);

    const handleSelect = (value: string) => {
        if (isAssignableEmployeeRole(value) && value !== employee.role) setPendingRole(value);
    };

    const handleConfirm = () => {
        if (!pendingRole) return;
        update.mutate(
            { id: employee.id, data: { role: pendingRole } },
            {
                onSuccess: () => {
                    toast.success(t("changed"));
                    setPendingRole(null);
                },
                onError: (error) => notifyApiError(error, t("error")),
            }
        );
    };

    return (
        <>
            <FieldSelect
                size="sm"
                className="w-auto min-w-36"
                aria-label={t("label")}
                options={ASSIGNABLE_EMPLOYEE_ROLES.map((role) => ({
                    value: role,
                    label: tRoles(role),
                }))}
                value={employee.role}
                onValueChange={handleSelect}
                disabled={update.isPending}
            />
            <ConfirmDialog
                open={pendingRole !== null}
                onOpenChange={(open) => {
                    if (!open) setPendingRole(null);
                }}
                title={t("confirmTitle")}
                description={t("confirmDescription", {
                    name: employeeName(employee),
                    role: pendingRole ? tRoles(pendingRole) : "",
                })}
                confirmLabel={update.isPending ? t("saving") : t("confirm")}
                cancelLabel={t("cancel")}
                onConfirm={handleConfirm}
                pending={update.isPending}
            />
        </>
    );
}
