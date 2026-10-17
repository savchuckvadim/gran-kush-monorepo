"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    type Employee,
    employeeName,
    useDeactivateEmployee,
    useUpdateEmployee,
} from "@/modules/entities/employee";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

/**
 * Доступ к CRM клуба. Закрыть — с подтверждением: сотрудник сразу теряет вход в клуб;
 * вернуть — одной кнопкой, это ничего не ломает.
 */
export function EmployeeAccessButton({ employee }: { employee: Employee }) {
    const t = useTranslations("crm.employees.card");
    const deactivate = useDeactivateEmployee();
    const update = useUpdateEmployee();
    const [confirming, setConfirming] = useState(false);

    if (!employee.isActive) {
        return (
            <Button
                variant="outline"
                size="sm"
                disabled={update.isPending}
                onClick={() =>
                    update.mutate(
                        { id: employee.id, data: { isActive: true } },
                        {
                            onSuccess: () => toast.success(t("reactivate.done")),
                            onError: (error) => notifyApiError(error, t("reactivate.error")),
                        }
                    )
                }
            >
                <UserCheck className="size-4" aria-hidden="true" />
                {t("reactivate.button")}
            </Button>
        );
    }

    const handleConfirm = () =>
        deactivate.mutate(employee.id, {
            onSuccess: () => {
                toast.success(t("deactivate.done"));
                setConfirming(false);
            },
            onError: (error) => notifyApiError(error, t("deactivate.error")),
        });

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirming(true)}
            >
                <UserX className="size-4" aria-hidden="true" />
                {t("deactivate.button")}
            </Button>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t("deactivate.confirmTitle")}
                description={t("deactivate.confirmDescription", { name: employeeName(employee) })}
                confirmLabel={t("deactivate.confirm")}
                cancelLabel={t("deactivate.cancel")}
                onConfirm={handleConfirm}
                pending={deactivate.isPending}
                tone="destructive"
            />
        </>
    );
}
