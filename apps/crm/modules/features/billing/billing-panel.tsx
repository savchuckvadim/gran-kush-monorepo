"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, ExternalLink } from "lucide-react";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";
import { Alert, AlertDescription, AlertTitle, Button, Card } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { portalInfoKeys } from "@/modules/entities/portal/hooks/portal-info.hook";

import { useBillingOverview, useBillingRedirect } from "./use-billing";

const PLAN_CODE = /^[a-z0-9-]{1,80}$/;

const STATUS_TONE: Record<string, string> = {
    trialing: "bg-primary/10 text-primary",
    active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    past_due: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    canceled: "bg-destructive/10 text-destructive",
    expired: "bg-destructive/10 text-destructive",
};

export function BillingPanel() {
    const t = useTranslations("crm.billing");
    const locale = useLocale();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const checkoutResult = searchParams.get("checkout");
    const requestedPlan = searchParams.get("plan");
    const plan = requestedPlan && PLAN_CODE.test(requestedPlan) ? requestedPlan : null;

    const overview = useBillingOverview(plan, checkoutResult === "success");
    const subscription = overview.data?.subscription;
    const waitingForWebhook =
        checkoutResult === "success" &&
        subscription !== undefined &&
        subscription.provider !== "stripe";
    const { checkout, manage } = useBillingRedirect();

    useEffect(() => {
        if (checkoutResult === "success" && subscription?.provider === "stripe") {
            void queryClient.invalidateQueries({ queryKey: portalInfoKeys.all });
        }
    }, [checkoutResult, subscription?.provider, queryClient]);

    const date = useMemo(
        () => (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale) : "—"),
        [locale]
    );
    const money = (amount: string, currency: string) =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));

    if (overview.isLoading) {
        return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
    }
    if (overview.error) {
        const forbidden =
            overview.error instanceof ApiClientError && overview.error.status === 403;
        return (
            <Alert variant="destructive">
                <AlertDescription>
                    {forbidden ? t("onlyOwner") : getApiErrorMessage(overview.error)}
                </AlertDescription>
            </Alert>
        );
    }
    if (!overview.data || !subscription) {
        return null;
    }

    const { paymentsEnabled, canManage, plans } = overview.data;
    const statusDate =
        subscription.status === "trialing"
            ? t("trialUntil", { date: date(subscription.trialEndsAt) })
            : subscription.status === "active"
              ? t(subscription.cancelAtPeriodEnd ? "endsOn" : "renewsOn", {
                    date: date(subscription.currentPeriodEnd),
                })
              : subscription.status === "past_due"
                ? t("graceUntil", { date: date(subscription.graceEndsAt) })
                : t("inactive");
    const actionError = checkout.error ?? manage.error;

    return (
        <div className="space-y-4">
            {checkoutResult === "success" && (
                <Alert>
                    <AlertTitle>{t("checkoutSuccessTitle")}</AlertTitle>
                    <AlertDescription>
                        {waitingForWebhook
                            ? t("checkoutWaiting")
                            : t("checkoutSuccess")}
                    </AlertDescription>
                </Alert>
            )}
            {checkoutResult === "cancel" && (
                <Alert>
                    <AlertDescription>{t("checkoutCanceled")}</AlertDescription>
                </Alert>
            )}
            {actionError && (
                <Alert variant="destructive">
                    <AlertDescription>{getApiErrorMessage(actionError)}</AlertDescription>
                </Alert>
            )}

            <Card className="max-w-3xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{t("currentPlan")}</p>
                        <p className="text-xl font-semibold">{subscription.plan.name}</p>
                        {Number(subscription.plan.priceAmount) > 0 && (
                            <p className="text-sm text-muted-foreground">
                                {money(subscription.plan.priceAmount, subscription.plan.currency)}{" "}
                                {t(`interval.${subscription.plan.interval}`)}
                            </p>
                        )}
                    </div>
                    <div className="space-y-1 text-right">
                        <span
                            className={cn(
                                "inline-block rounded-full px-3 py-1 text-xs font-medium",
                                STATUS_TONE[subscription.status]
                            )}
                        >
                            {t(`status.${subscription.status}`)}
                        </span>
                        <p className="text-sm text-muted-foreground">{statusDate}</p>
                    </div>
                </div>

                {canManage && (
                    <div className="mt-4 border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={() => manage.mutate()}
                            disabled={manage.isPending}
                        >
                            <ExternalLink className="size-4" />
                            {t("manage")}
                        </Button>
                        <p className="mt-2 text-xs text-muted-foreground">{t("manageHint")}</p>
                    </div>
                )}
            </Card>

            {!canManage && (
                <div className="max-w-3xl space-y-3">
                    <h2 className="text-lg font-semibold">{t("choosePlan")}</h2>
                    {!paymentsEnabled && (
                        <p className="text-sm text-muted-foreground">{t("paymentsSoon")}</p>
                    )}
                    {subscription.status === "trialing" && paymentsEnabled && (
                        <p className="text-sm text-muted-foreground">{t("payEndsTrial")}</p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                        {plans.map((option) => (
                            <Card key={option.code} className="flex flex-col gap-3 p-4">
                                <div>
                                    <p className="font-medium">{option.name}</p>
                                    <p className="text-2xl font-semibold">
                                        {money(option.priceAmount, option.currency)}
                                        <span className="ml-1 text-sm font-normal text-muted-foreground">
                                            {t(`interval.${option.interval}`)}
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">{t("vatNote")}</p>
                                </div>
                                <Button
                                    className="mt-auto"
                                    disabled={!option.purchasable || checkout.isPending}
                                    onClick={() => checkout.mutate(option.code)}
                                >
                                    <CreditCard className="size-4" />
                                    {checkout.isPending && checkout.variables === option.code
                                        ? t("redirecting")
                                        : t("pay")}
                                </Button>
                            </Card>
                        ))}
                        {plans.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t("noPlans")}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
