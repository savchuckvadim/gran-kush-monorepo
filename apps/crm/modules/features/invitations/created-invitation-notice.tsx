"use client";

import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import { LinkUrlField } from "@/modules/shared/ui/LinkUrlField";

interface CreatedInvitationNoticeProps {
    email: string;
    url: string;
    onDone: () => void;
}

/** Что видно после «Пригласить»: письмо ушло, а ссылку можно передать и самому — только сейчас. */
export function CreatedInvitationNotice({ email, url, onDone }: CreatedInvitationNoticeProps) {
    const t = useTranslations("crm.invitations.create");

    return (
        <div className="space-y-4">
            <p className="text-sm">
                {t.rich("linkNotice", {
                    email,
                    strong: (chunks) => <strong className="font-semibold">{chunks}</strong>,
                })}
            </p>
            <LinkUrlField url={url} />
            <div className="flex justify-end">
                <Button type="button" onClick={onDone}>
                    {t("done")}
                </Button>
            </div>
        </div>
    );
}
