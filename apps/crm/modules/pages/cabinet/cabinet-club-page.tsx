"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Loader2, QrCode, RefreshCw } from "lucide-react";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";
import { Badge, Button, Card, ConfirmDialog, QrCodeDisplay } from "@workspace/ui";

import {
    useMyPresenceHistory,
    useMyPresenceStatus,
    useMyQrCode,
    useRegenerateQrCode,
} from "@/modules/entities/cabinet-club";
import { useMyMemberships } from "@/modules/entities/membership";
import { ClubBadge } from "@/modules/shared/ui/Brand";

const formatDateTime = (iso: string, locale: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(iso)
    );

const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
};

/**
 * Главная клуба: QR для стойки и присутствие. QR всегда тёмный на светлом, независимо от темы
 * сайта: сканер на стойке читает его контрастным. Уровень коррекции M — код редкий и читается
 * с первого раза. Код выдаёт и продлевает сам API при первом открытии.
 */
export function CabinetClubPage({ slug }: { slug: string }) {
    const t = useTranslations("cabinet.club");
    const locale = useLocale();
    const [confirmReissue, setConfirmReissue] = useState(false);

    const { data: memberships = [], isLoading: loadingMemberships } = useMyMemberships();
    const membership = memberships.find((m) => m.slug === slug);

    const confirmed = membership?.consentStatus === "confirmed" && membership.isActive;
    const qr = useMyQrCode(slug);
    const regenerate = useRegenerateQrCode(slug);
    const presence = useMyPresenceStatus(slug);
    const history = useMyPresenceHistory(slug);

    if (loadingMemberships) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    if (!membership || !confirmed) {
        return (
            <Card>
                <div className="space-y-1 px-4">
                    <p className="font-medium">{t("notMemberTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("notMemberText")}</p>
                </div>
            </Card>
        );
    }

    const present = presence.data?.isPresent === true;
    const sessions = history.data?.items ?? [];
    const qrError =
        qr.error instanceof ApiClientError && qr.error.status === 403
            ? t("qrClosed")
            : qr.error
              ? getApiErrorMessage(qr.error)
              : null;

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-3">
                <ClubBadge name={membership.displayName} className="size-10" />
                <div className="min-w-0">
                    <h1 className="truncate text-2xl font-semibold tracking-tight">
                        {membership.displayName}
                    </h1>
                    {presence.data && (
                        <Badge variant={present ? "default" : "outline"}>
                            {present ? t("inClub") : t("outsideClub")}
                        </Badge>
                    )}
                </div>
            </header>

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
                                <div className="mx-auto w-fit rounded-xl bg-white p-3">
                                    <QrCodeDisplay
                                        value={qr.data.encryptedCode}
                                        size={256}
                                        level="M"
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                        includeMargin={false}
                                    />
                                </div>
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
