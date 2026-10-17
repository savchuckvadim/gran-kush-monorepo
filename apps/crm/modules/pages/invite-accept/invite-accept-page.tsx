"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Card } from "@workspace/ui";

import { useProviderAvailable } from "@/modules/entities/account-security";
import {
    getPublicInvitation,
    type InvitationAcceptance,
    type OpenSession,
    useOpenSessions,
} from "@/modules/entities/invitations";
import { googleSignInUrl } from "@/modules/shared/api/google-sign-in";
import { GoogleButton } from "@/modules/shared/ui/GoogleButton";
import { StatusCard } from "@/modules/shared/ui/StatusCard";

import { InvitePasswordForm } from "./invite-password-form";
import { InviteSessionAccept } from "./invite-session-accept";

/** Причины, с которыми Google-вход возвращает на приглашение (`?error=`). */
const GOOGLE_ERRORS = ["invite_email_mismatch", "invite_invalid", "invite_already_employee"];

const isFor = (session: OpenSession | null, email: string): session is OpenSession =>
    session !== null && session.email.trim().toLowerCase() === email.trim().toLowerCase();

/**
 * Приглашение сотрудника. Способ принять выбирается по тому, что уже есть у человека: открытая
 * сессия на адрес приглашения — одна кнопка; иначе пароль (новый или от аккаунта) или Google.
 * Принято — сразу в CRM клуба; всё остальное (подтвердить почту, задать пароль) — карточкой.
 */
export function InviteAcceptPage({ token }: { token: string }) {
    const t = useTranslations("invite");
    const locale = useLocale();
    const googleOn = useProviderAvailable("crm", "google");
    const router = useRouter();
    const params = useSearchParams();
    const [outcome, setOutcome] = useState<InvitationAcceptance | null>(null);
    const sessions = useOpenSessions();
    const info = useQuery({
        queryKey: ["public-invitation", token],
        queryFn: () => getPublicInvitation(token),
        retry: false,
    });

    const finish = (result: InvitationAcceptance) => {
        if (result.outcome === "accepted") {
            router.push(`/${locale}/${result.portalSlug}/crm`);
            return;
        }
        setOutcome(result);
    };

    if (info.isLoading || sessions.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }
    if (info.isError || !info.data) {
        return <StatusCard tone="error" text={t("invalid")} />;
    }

    const invitation = info.data;
    if (outcome) {
        return (
            <StatusCard
                title={t(`outcomes.${outcome.outcome}.title`)}
                text={t(`outcomes.${outcome.outcome}.text`, {
                    email: invitation.email,
                    club: invitation.portalDisplayName,
                })}
            />
        );
    }

    const ownSession = isFor(sessions.crm, invitation.email)
        ? { kind: "crm" as const, ...sessions.crm }
        : isFor(sessions.cabinet, invitation.email)
          ? { kind: "cabinet" as const, ...sessions.cabinet }
          : null;
    // Сессия на этот адрес без подтверждённой почты владельца не доказывает: подтвердить или Google
    const session = ownSession?.emailConfirmed ? ownSession.kind : null;
    const otherEmail = ownSession ? null : (sessions.crm?.email ?? sessions.cabinet?.email ?? null);
    const googleError = params.get("error");

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-md p-6">
                <h1 className="text-xl font-semibold">
                    {t("title", { club: invitation.portalDisplayName })}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("subtitle", {
                        email: invitation.email,
                        role: invitation.role.isSystem
                            ? t(`roles.${invitation.role.key}`)
                            : (invitation.role.name ?? invitation.role.key),
                    })}
                </p>

                <div className="mt-4 space-y-4">
                    {googleError && GOOGLE_ERRORS.includes(googleError) && (
                        <p role="alert" className="text-sm text-destructive">
                            {t(`errors.${googleError}`)}
                        </p>
                    )}

                    {session ? (
                        <InviteSessionAccept
                            token={token}
                            session={session}
                            email={invitation.email}
                            onDone={finish}
                        />
                    ) : (
                        <>
                            {otherEmail && (
                                <p className="text-sm text-muted-foreground">
                                    {t("otherSession", { email: otherEmail })}
                                </p>
                            )}
                            {ownSession && !ownSession.emailConfirmed && (
                                <p className="text-sm text-muted-foreground">
                                    {t("unconfirmedSession", { email: ownSession.email })}
                                </p>
                            )}
                            <InvitePasswordForm
                                token={token}
                                accountState={invitation.accountState}
                                onDone={finish}
                            />
                            {googleOn && (
                                <GoogleButton
                                    href={googleSignInUrl("crm", {
                                        locale,
                                        intent: { kind: "invitation", token },
                                    })}
                                    label={t("google")}
                                    separator={t("or")}
                                />
                            )}
                        </>
                    )}
                </div>
            </Card>
        </div>
    );
}
