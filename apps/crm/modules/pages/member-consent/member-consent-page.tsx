"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldOff } from "lucide-react";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, FieldInput, Switch } from "@workspace/ui";

import {
    confirmMemberConsent,
    declineMemberConsent,
    getPublicMemberConsent,
} from "@/modules/entities/member";

/**
 * Клуб добавил существующий аккаунт по email: владелец подтверждает членство и выбирает,
 * какие документы показать клубу (TASK-663). Пароль просим, только если он есть у аккаунта:
 * без пароля (вход только через Google) достаточно ссылки из письма (TASK-702).
 * Публичная страница CRM, без входа.
 */
export function MemberConsentPage({ token }: { token: string }) {
    const t = useTranslations("consent");

    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [serverError, setServerError] = useState<string | null>(null);
    const [sharedDocuments, setSharedDocuments] = useState<Set<string>>(new Set());
    const [shareSignature, setShareSignature] = useState(false);

    const info = useQuery({
        queryKey: ["public-member-consent", token],
        queryFn: () => getPublicMemberConsent(token),
        retry: false,
    });

    // 401 here means the password did not match the account, not a lost session
    const showError = (error: unknown) =>
        setServerError(
            error instanceof ApiClientError && error.status === 401
                ? t("errors.wrongPassword")
                : getApiErrorMessage(error)
        );

    const confirm = useMutation({
        mutationFn: () =>
            confirmMemberConsent(token, {
                password: needsPassword ? password : undefined,
                shareDocumentIds: Array.from(sharedDocuments),
                shareSignature,
            }),
        onError: showError,
    });
    const decline = useMutation({
        mutationFn: () =>
            declineMemberConsent(token, { password: needsPassword ? password : undefined }),
        onError: showError,
    });
    const busy = confirm.isPending || decline.isPending;
    const needsPassword = info.data?.requiresPassword ?? true;

    const withPassword = (run: () => void) => {
        if (needsPassword && !password) {
            setPasswordError(t("errors.password"));
            return;
        }
        setPasswordError(null);
        setServerError(null);
        run();
    };

    const toggleDocument = (id: string, on: boolean) =>
        setSharedDocuments((prev) => {
            const next = new Set(prev);
            if (on) next.add(id);
            else next.delete(id);
            return next;
        });

    if (info.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (info.isError || !info.data) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-4">
                <Card className="w-full max-w-md p-6 text-center">
                    <p className="text-sm text-destructive">{t("invalid")}</p>
                </Card>
            </div>
        );
    }

    const club = info.data.portalDisplayName;

    if (confirm.isSuccess || decline.isSuccess) {
        const confirmed = confirm.isSuccess;
        return (
            <div className="flex min-h-[50vh] items-center justify-center p-4">
                <Card className="w-full max-w-md p-6 text-center">
                    {confirmed ? (
                        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
                    ) : (
                        <ShieldOff
                            className="mx-auto size-10 text-muted-foreground"
                            aria-hidden="true"
                        />
                    )}
                    <h1 className="mt-3 text-xl font-semibold">
                        {t(confirmed ? "done.confirmedTitle" : "done.declinedTitle")}
                    </h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t(confirmed ? "done.confirmed" : "done.declined", { club })}
                    </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-xl p-6">
                <h1 className="text-xl font-semibold">{t("title", { club })}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t("intro", { club, email: info.data.email })}
                </p>

                <div className="mt-6 space-y-5">
                    <section>
                        <h2 className="text-sm font-medium">{t("documents")}</h2>
                        {info.data.documents.length === 0 && !info.data.hasSignature ? (
                            <p className="mt-1 text-sm text-muted-foreground">{t("noDocuments")}</p>
                        ) : (
                            <ul className="mt-2 space-y-2">
                                {info.data.documents.map((document) => (
                                    <li
                                        key={document.id}
                                        className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                                    >
                                        <span>
                                            {document.type} · {t(`sides.${document.side}`)}
                                        </span>
                                        <Switch
                                            checked={sharedDocuments.has(document.id)}
                                            onCheckedChange={(on) =>
                                                toggleDocument(document.id, on)
                                            }
                                            disabled={busy}
                                            aria-label={document.type}
                                        />
                                    </li>
                                ))}
                                {info.data.hasSignature && (
                                    <li className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                                        <span>{t("signature")}</span>
                                        <Switch
                                            checked={shareSignature}
                                            onCheckedChange={setShareSignature}
                                            disabled={busy}
                                            aria-label={t("signature")}
                                        />
                                    </li>
                                )}
                            </ul>
                        )}
                    </section>

                    {needsPassword && (
                        <FieldInput
                            label={t("password")}
                            type="password"
                            required
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            error={passwordError ?? undefined}
                        />
                    )}

                    {serverError && <p className="text-sm text-destructive">{serverError}</p>}

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                            className="flex-1"
                            disabled={busy}
                            onClick={() => withPassword(() => confirm.mutate())}
                        >
                            {confirm.isPending ? t("working") : t("confirm")}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1"
                            disabled={busy}
                            onClick={() => withPassword(() => decline.mutate())}
                        >
                            {decline.isPending ? t("working") : t("decline")}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
