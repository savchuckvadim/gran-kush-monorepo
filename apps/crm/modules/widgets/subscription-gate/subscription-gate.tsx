"use client";

import { useTranslations } from "next-intl";

import { TriangleAlert } from "lucide-react";

import { SchemaPortalInfoDto } from "@workspace/api-client/core";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui";

import { usePortalInfo } from "@/modules/entities/portal";

const BLOCKING_STATUSES = new Set(["canceled", "expired"]);

function isSubscriptionBlocked(info: SchemaPortalInfoDto): boolean {
    const subscription = info.subscription;
    if (!subscription) {
        return false;
    }
    if (BLOCKING_STATUSES.has(subscription.status)) {
        return true;
    }
    if (subscription.status === "past_due" && subscription.graceEndsAt) {
        return new Date(subscription.graceEndsAt).getTime() < Date.now();
    }
    return false;
}

interface SubscriptionGateProps {
    children: React.ReactNode;
}

/** Баннер при past_due (grace) и hard-block вместо контента при canceled/expired/grace-истёк. */
export function SubscriptionGate({ children }: SubscriptionGateProps) {
    const t = useTranslations("crm.subscription");
    const { data: info } = usePortalInfo();
    const subscription = info?.subscription;

    if (info && isSubscriptionBlocked(info)) {
        return (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
                <TriangleAlert className="size-12 text-destructive" />
                <h2 className="text-2xl font-semibold">{t("blockedTitle")}</h2>
                <p className="max-w-md text-muted-foreground">
                    {t("blockedDescription", { portal: info.displayName })}
                </p>
                {subscription?.planName && (
                    <p className="text-sm text-muted-foreground">
                        {t("plan")}: {subscription.planName}
                    </p>
                )}
            </div>
        );
    }

    return (
        <>
            {subscription?.status === "past_due" && (
                <Alert variant="destructive" className="mb-4">
                    <TriangleAlert />
                    <AlertTitle>{t("pastDueTitle")}</AlertTitle>
                    <AlertDescription>
                        {subscription.graceEndsAt
                            ? t("pastDueUntil", {
                                  date: new Date(subscription.graceEndsAt).toLocaleDateString(),
                              })
                            : t("pastDueDescription")}
                    </AlertDescription>
                </Alert>
            )}
            {children}
        </>
    );
}
