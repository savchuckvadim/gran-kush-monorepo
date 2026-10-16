"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2, QrCode, RefreshCw } from "lucide-react";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog, ScannableQrCode } from "@workspace/ui";

import {
    useMyPresenceHistory,
    useMyQrCode,
    useRegenerateQrCode,
} from "@/modules/entities/cabinet-club";
import { useWakeLock } from "@/modules/shared/lib/use-wake-lock";

const formatDateTime = (iso: string, locale: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(iso)
    );

const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};

/**
 * Главная клуба: QR для стойки и последние визиты; членство уже проверил раздел клуба.
 * QR всегда тёмный на светлом, независимо от темы сайта: сканер на стойке читает его контрастным.
 * Уровень коррекции M — код редкий и читается с первого раза. Код выдаёт и продлевает сам API
 * при первом открытии. Пока код на экране, экран не гаснет.
 */
export function CabinetClubPage({ slug }: { slug: string }) {
    const t = useTranslations("cabinet.club");
    const locale = useLocale();
    const [confirmReissue, setConfirmReissue] = useState(false);

    const qr = useMyQrCode(slug);
    const regenerate = useRegenerateQrCode(slug);
    const history = useMyPresenceHistory(slug);
    useWakeLock(Boolean(qr.data));

    const sessions = history.data?.items ?? [];
    const qrError =
        qr.error instanceof ApiClientError && qr.error.status === 403
            ? t("qrClosed")
            : qr.error
              ? getApiErrorMessage(qr.error)
              : null;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <div className="space-y-4 px-4">
                        <div className="flex items-center gap-2">
                            <QrCode className="size-5" aria-hidden="true" />
                            <h2 className="text-lg font-medium">{t("qrTitle")}</h2>
                        </div>
                        <p className="text-sm text-muted-foreground">{t("qrHint")}</p>

                        {qr.isLoading && (
                            <div className="flex justify-center py-10">
                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {qrError && (
                            <p role="alert" className="text-sm text-destructive">
                                {qrError}
                            </p>
                        )}
                        {qr.data && (
                            <div className="space-y-3">
                                <ScannableQrCode value={qr.data.code} />
                                <p className="text-center text-xs text-muted-foreground">
                                    {t("validUntil", {
                                        date: formatDateTime(qr.data.expiresAt, locale),
                                    })}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mx-auto flex"
                                    disabled={regenerate.isPending}
                                    onClick={() => setConfirmReissue(true)}
                                >
                                    <RefreshCw aria-hidden="true" />
                                    {t("reissue")}
                                </Button>
                            </div>
                        )}
                    </div>
                </Card>

                <Card>
                    <div className="space-y-3 px-4">
                        <h2 className="text-lg font-medium">{t("visitsTitle")}</h2>
                        {sessions.length === 0 ? (
                            <p className="text-sm text-muted-foreground">{t("noVisits")}</p>
                        ) : (
                            <ul className="divide-y">
                                {sessions.map((session) => (
                                    <li
                                        key={session.id}
                                        className="flex items-center justify-between gap-3 py-2 text-sm"
                                    >
                                        <span>{formatDateTime(session.enteredAt, locale)}</span>
                                        <span className="text-muted-foreground">
                                            {session.isActive
                                                ? t("nowInClub")
                                                : session.durationMinutes != null
                                                  ? formatDuration(session.durationMinutes)
                                                  : "—"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </Card>
            </div>

            <ConfirmDialog
                open={confirmReissue}
                onOpenChange={setConfirmReissue}
                title={t("reissueTitle")}
                description={t("reissueText")}
                confirmLabel={t("reissueConfirm")}
                cancelLabel={t("cancel")}
                pending={regenerate.isPending}
                tone="destructive"
                onConfirm={() =>
                    regenerate.mutate(undefined, { onSettled: () => setConfirmReissue(false) })
                }
            />
        </div>
    );
}
