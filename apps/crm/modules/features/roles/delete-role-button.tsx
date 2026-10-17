"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    type PortalRole,
    useDeletePortalRole,
    useRoleErrorText,
    useRoleLabel,
} from "@/modules/entities/access";

/** Удаление своей роли с подтверждением; занятую роль API не удалит и объяснит почему. */
export function DeleteRoleButton({ role, onDeleted }: { role: PortalRole; onDeleted: () => void }) {
    const t = useTranslations("crm.access.rolesPage");
    const remove = useDeletePortalRole();
    const errorText = useRoleErrorText();
    const label = useRoleLabel();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
                <Trash2 aria-hidden="true" />
                {t("delete")}
            </Button>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title={t("deleteTitle", { name: label(role) })}
                description={t("deleteDescription")}
                confirmLabel={t("delete")}
                cancelLabel={t("cancel")}
                tone="destructive"
                pending={remove.isPending}
                onConfirm={() =>
                    remove.mutate(role.id, {
                        onSuccess: () => {
                            toast.success(t("deleted"));
                            setOpen(false);
                            onDeleted();
                        },
                        onError: (error) => toast.error(errorText(error)),
                    })
                }
            />
        </>
    );
}
