"use client";

import { useTranslations } from "next-intl";

import { CheckCircle2, Clock, XCircle } from "lucide-react";

import { Alert, AlertDescription, Card } from "@workspace/ui";

import { useMyPresenceStatus } from "@/modules/entities/presence";

export function CurrentPresenceStatus() {
    const t = useTranslations("profile.presence");
    const { data, isLoading, error } = useMyPresenceStatus();

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 animate-pulse" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-4">
                <Alert variant="destructive">
                    <AlertDescription>
                        {t("error")}: {error.message}
                    </AlertDescription>
                </Alert>
            </Card>
        );
    }

    const isPresent = data?.isPresent ?? false;
    const currentSession = data?.currentSession;

    return (
        <Card className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isPresent ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                        <p className="text-sm font-medium">
                            {isPresent ? t("status.present") : t("status.notPresent")}
                        </p>
                        {currentSession && (
                            <p className="text-xs text-muted-foreground">
                                {t("status.enteredAt")}:{" "}
                                {new Date(currentSession.enteredAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
}
