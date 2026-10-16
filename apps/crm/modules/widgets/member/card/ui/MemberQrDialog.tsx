"use client";

import { useTranslations } from "next-intl";

import { QrCode } from "lucide-react";

import { Button, ModalDialog } from "@workspace/ui";

import { MemberQrCodeCard } from "../../qr-code/MemberQrCodeCard";

/** The entry QR behind a button: on the card it is needed now and then, not all the time. */
export function MemberQrDialog({ memberId }: { memberId: string }) {
    const t = useTranslations("crm.members.card");

    return (
        <ModalDialog
            size="md"
            title={t("qr")}
            trigger={
                <Button variant="outline" size="icon" aria-label={t("qr")} title={t("qr")}>
                    <QrCode className="size-4" aria-hidden="true" />
                </Button>
            }
        >
            <MemberQrCodeCard memberId={memberId} />
        </ModalDialog>
    );
}
