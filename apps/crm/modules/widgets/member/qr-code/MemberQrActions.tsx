"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Ban, Printer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import { useReissueMemberQrCode, useRevokeMemberQrCode } from "@/modules/entities/qr-code";
import { ROUTES } from "@/modules/shared/config/routes";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

type Action = "reissue" | "revoke";

/**
 * Печать — на отдельной странице в новой вкладке, карточка остаётся открытой. Перевыпуск и отзыв
 * гасят прежний код и в телефоне, и на распечатке, поэтому идут через подтверждение.
 */
export function MemberQrActions({ memberId }: { memberId: string }) {
    const t = useTranslations("crm.members.qrCode");
    const link = useLocalizedLink();
    const reissue = useReissueMemberQrCode(memberId);
    const revoke = useRevokeMemberQrCode(memberId);
    // действие держится и после закрытия: диалог не меняет текст, пока гаснет
    const [action, setAction] = useState<Action>("reissue");
    const [open, setOpen] = useState(false);

    const ask = (next: Action) => {
        setAction(next);
        setOpen(true);
    };

    const run = () => {
        const mutation = action === "reissue" ? reissue : revoke;
        mutation.mutate(undefined, {
            onSuccess: () => {
                setOpen(false);
                toast.success(t(action === "reissue" ? "reissued" : "revoked"));
            },
            onError: (error) => notifyApiError(error),
        });
    };

    return (
        <>
            <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline" size="sm">
                    <Link
                        href={link(`${ROUTES.PRINT_MEMBER_QR}/${memberId}`)}
                        target="_blank"
                        rel="noopener"
                    >
                        <Printer aria-hidden="true" />
                        {t("print")}
                    </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => ask("reissue")}>
                    <RefreshCw aria-hidden="true" />
                    {t("reissue")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => ask("revoke")}>
                    <Ban aria-hidden="true" />
                    {t("revoke")}
                </Button>
            </div>

            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                title={t(`${action}Title`)}
                description={t(`${action}Description`)}
                confirmLabel={t(action)}
                cancelLabel={t("cancel")}
                tone={action === "revoke" ? "destructive" : "default"}
                pending={reissue.isPending || revoke.isPending}
                onConfirm={run}
            />
        </>
    );
}
