"use client";

import { useTranslations } from "next-intl";

import { ConfirmDialog } from "@workspace/ui";

import { isFailureStage } from "@/modules/entities/order";

import type { StageMoveRequest } from "../model/stage-move-request";

interface CloseOrderDialogProps {
    request: StageMoveRequest | null;
    onConfirm: () => void;
    onDismiss: () => void;
    pending: boolean;
}

/** "Finish / cancel the order?" — closing is final, and a cancel returns the goods to stock. */
export function CloseOrderDialog({
    request,
    onConfirm,
    onDismiss,
    pending,
}: CloseOrderDialogProps) {
    const t = useTranslations("crm.orders.stage");
    const isCancel = request ? isFailureStage(request.target) : false;
    const values = { number: request?.order.orderNumber ?? "", stage: request?.target.name ?? "" };

    return (
        <ConfirmDialog
            open={request !== null}
            onOpenChange={(open) => {
                if (!open) onDismiss();
            }}
            title={t(isCancel ? "confirmFailureTitle" : "confirmSuccessTitle", values)}
            description={t(isCancel ? "confirmFailure" : "confirmSuccess", values)}
            confirmLabel={t("confirm")}
            cancelLabel={t("cancel")}
            onConfirm={onConfirm}
            pending={pending}
            tone={isCancel ? "destructive" : "default"}
        />
    );
}
