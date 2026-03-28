"use client";

import { useTranslations } from "next-intl";

import { AlertCircle, Loader2, QrCode, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, Button, Card } from "@workspace/ui";

import { useQrCode, useRegenerateQrCode } from "@/modules/entities/qr-code";

interface MemberQrCodeCardProps {
    memberId: string;
}

export function MemberQrCodeCard({ memberId }: MemberQrCodeCardProps) {
    const t = useTranslations("crm.members.qrCode");
    const { data: qrCode, isLoading, error } = useQrCode(memberId);
    const regenerateMutation = useRegenerateQrCode();

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {t("error")}: {error.message}
                    </AlertDescription>
                </Alert>
            </Card>
        );
    }

    if (!qrCode) {
        return (
            <Card className="p-4 ">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-base font-medium">{t("title")}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{t("notFound")}</p>
                    <Button
                        onClick={() => regenerateMutation.mutate(memberId)}
                        disabled={regenerateMutation.isPending}
                        size="sm"
                    >
                        {regenerateMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("generating")}
                            </>
                        ) : (
                            <>
                                <QrCode className="mr-2 h-4 w-4" />
                                {t("generate")}
                            </>
                        )}
                    </Button>
                </div>
            </Card>
        );
    }

    const isExpired = qrCode.isExpired;
    const expiresAt = new Date(qrCode.expiresAt);

    return (
        <Card className="p-4 h-full">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-base font-medium">{t("title")}</h3>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => regenerateMutation.mutate(memberId)}
                        disabled={regenerateMutation.isPending}
                    >
                        {regenerateMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("regenerating")}
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {t("regenerate")}
                            </>
                        )}
                    </Button>
                </div>

                {isExpired && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{t("expired")}</AlertDescription>
                    </Alert>
                )}

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("status")}</span>
                        <span className={isExpired ? "text-destructive" : "text-green-600"}>
                            {isExpired ? t("expired") : t("active")}
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("expiresAt")}</span>
                        <span>{expiresAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("createdAt")}</span>
                        <span>{new Date(qrCode.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-4">
                    <p className="text-xs text-muted-foreground">{t("note")}</p>
                </div>
            </div>
        </Card>
    );
}
