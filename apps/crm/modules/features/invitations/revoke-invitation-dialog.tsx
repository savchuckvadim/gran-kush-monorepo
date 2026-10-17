"use client";

import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { ConfirmDialog } from "@workspace/ui";

import { type Invitation, useRevokeInvitation } from "@/modules/entities/invitations";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

interface RevokeInvitationDialogProps {
    /** Приглашение, которое отзывают; `null` — диалог закрыт */
    invitation: Invitation | null;
    onClose: () => void;
}

/** «Отозвать приглашение?»: ссылка из письма перестаёт работать. */
export function RevokeInvitationDialog({ invitation, onClose }: RevokeInvitationDialogProps) {
    const t = useTranslations("crm.invitations.revoke");
    const revoke = useRevokeInvitation();

    const handleConfirm = () => {
        if (!invitation) return;
        revoke.mutate(invitation.id, {
            onSuccess: () => {
                toast.success(t("done"));
                onClose();
            },
            onError: (error) => notifyApiError(error, t("error")),
        });
    };

    return (
        <ConfirmDialog
            open={invitation !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
            title={t("confirmTitle")}
            description={t("confirmDescription", { email: invitation?.email ?? "" })}
            confirmLabel={t("confirm")}
            cancelLabel={t("cancel")}
            onConfirm={handleConfirm}
            pending={revoke.isPending}
            tone="destructive"
        />
    );
}
