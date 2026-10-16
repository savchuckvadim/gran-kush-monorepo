"use client";

import { useTranslations } from "next-intl";

import { useMutation } from "@tanstack/react-query";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import {
    acceptInvitationWithCabinetSession,
    acceptInvitationWithCrmSession,
    type InvitationAcceptance,
} from "@/modules/entities/invitations";

interface InviteSessionAcceptProps {
    token: string;
    /** Какой сессией принять: CRM (уже сотрудник другого клуба) или кабинета (участник). */
    session: "crm" | "cabinet";
    email: string;
    onDone: (result: InvitationAcceptance) => void;
}

/** Адрес открытой сессии совпал с адресом приглашения: принять одним нажатием, без пароля. */
export function InviteSessionAccept({ token, session, email, onDone }: InviteSessionAcceptProps) {
    const t = useTranslations("invite");
    const accept = useMutation({
        mutationFn: () =>
            session === "crm"
                ? acceptInvitationWithCrmSession(token)
                : acceptInvitationWithCabinetSession(token),
        onSuccess: onDone,
    });

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("signedInAs", { email })}</p>
            {accept.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(accept.error)}
                </p>
            )}
            <Button className="w-full" onClick={() => accept.mutate()} disabled={accept.isPending}>
                {accept.isPending ? t("accepting") : t("acceptAs", { email })}
            </Button>
        </div>
    );
}
