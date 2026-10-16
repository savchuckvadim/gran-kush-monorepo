"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useMutation } from "@tanstack/react-query";

import { getApiErrorMessage, type SchemaPublicInvitationInfoDto } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import {
    acceptInvitationWithPassword,
    type InvitationAcceptance,
} from "@/modules/entities/invitations";

interface InvitePasswordFormProps {
    token: string;
    accountState: SchemaPublicInvitationInfoDto["accountState"];
    onDone: (result: InvitationAcceptance) => void;
}

/**
 * Приём без открытой сессии. Нового аккаунта нет — имя и пароль; аккаунт с паролем доказывает
 * себя им; у аккаунта без пароля пароль здесь не ставится (ссылку видел и админ) — ему уходит
 * письмо, чтобы задать пароль, или он входит через Google.
 */
export function InvitePasswordForm({ token, accountState, onDone }: InvitePasswordFormProps) {
    const t = useTranslations("invite");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");

    const accept = useMutation({
        mutationFn: () =>
            acceptInvitationWithPassword(token, {
                password: password || undefined,
                fields: firstName.trim() ? { first_name: firstName.trim() } : undefined,
            }),
        onSuccess: onDone,
    });

    const error = accept.error ? (
        <p role="alert" className="text-sm text-destructive">
            {getApiErrorMessage(accept.error)}
        </p>
    ) : null;

    if (accountState === "passwordless") {
        return (
            <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("passwordlessHint")}</p>
                {error}
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => accept.mutate()}
                    disabled={accept.isPending}
                >
                    {accept.isPending ? t("accepting") : t("sendSetupLink")}
                </Button>
            </div>
        );
    }

    const isNew = accountState === "new";
    return (
        <form
            className="space-y-3"
            onSubmit={(event) => {
                event.preventDefault();
                accept.mutate();
            }}
        >
            {isNew ? (
                <FieldInput
                    label={t("firstName")}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                />
            ) : (
                <p className="text-sm text-muted-foreground">{t("existingHint")}</p>
            )}
            <FieldInput
                label={isNew ? t("password") : t("accountPassword")}
                type="password"
                required
                autoComplete={isNew ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
            />
            {error}
            <Button type="submit" className="w-full" disabled={accept.isPending || !password}>
                {accept.isPending ? t("accepting") : t("accept")}
            </Button>
        </form>
    );
}
