"use client";

import { useLocale, useTranslations } from "next-intl";

import { AlertCircle, Loader2, QrCode } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Alert, AlertDescription, Button, Card, ScannableQrCode } from "@workspace/ui";

import { useMemberQrCode, useReissueMemberQrCode } from "@/modules/entities/qr-code";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

import { MemberQrActions } from "./MemberQrActions";

const formatDate = (iso: string, locale: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(iso));

/**
 * Код участника для входа: сам код (сотрудник может показать или распечатать его участнику без
 * телефона), срок, печать, перевыпуск и отзыв. Кода нет — кабинет выдаст его сам, а здесь его можно
 * выпустить для распечатки.
 */
export function MemberQrCodeCard({ memberId }: { memberId: string }) {
    const t = useTranslations("crm.members.qrCode");
    const locale = useLocale();
    const qr = useMemberQrCode(memberId);
    const issue = useReissueMemberQrCode(memberId);

    return (
        <Card className="h-full space-y-4 p-4">
            <div className="flex items-center gap-2">
                <QrCode className="size-5 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-base font-medium">{t("title")}</h3>
            </div>

            {qr.isLoading && (
                <div className="flex justify-center py-8">
                    <Loader2
                        className="size-6 animate-spin text-muted-foreground"
                        aria-hidden="true"
                    />
                </div>
            )}

            {qr.error && (
                <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" />
                    <AlertDescription>{getApiErrorMessage(qr.error)}</AlertDescription>
                </Alert>
            )}

            {qr.data === null && (
                <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{t("notFound")}</p>
                    <Button
                        size="sm"
                        disabled={issue.isPending}
                        onClick={() =>
                            issue.mutate(undefined, { onError: (error) => notifyApiError(error) })
                        }
                    >
                        <QrCode aria-hidden="true" />
                        {issue.isPending ? t("generating") : t("generate")}
                    </Button>
                </div>
            )}

            {qr.data && (
                <div className="space-y-3">
                    <ScannableQrCode value={qr.data.encryptedCode} size={200} />
                    <p
                        className={
                            qr.data.isExpired
                                ? "text-center text-sm text-destructive"
                                : "text-center text-xs text-muted-foreground"
                        }
                    >
                        {qr.data.isExpired
                            ? t("expired")
                            : t("validUntil", { date: formatDate(qr.data.expiresAt, locale) })}
                    </p>
                    <MemberQrActions memberId={memberId} />
                </div>
            )}
        </Card>
    );
}
