"use client";

import { useLocale, useTranslations } from "next-intl";

import { CreditCard } from "lucide-react";

import { usePortalInfo } from "@/modules/entities/portal";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { SettingsTile, SettingsTileGrid, type TileTone } from "../settings-tile";

const STATUS_TONE: Record<string, TileTone> = {
    active: "ok",
    trialing: "ok",
    past_due: "warn",
    canceled: "warn",
    expired: "warn",
};

export function BillingPanel() {
    const t = useTranslations("crm.settingsHub.tiles");
    const tBilling = useTranslations("crm.billing");
    const locale = useLocale();
    const link = useLocalizedLink();
    const { data: info, isLoading } = usePortalInfo();
    const subscription = info?.subscription;
    const date = (value: string | null | undefined) =>
        value
            ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value))
            : null;
    const until =
        subscription?.status === "trialing"
            ? date(subscription.trialEndsAt)
            : subscription?.status === "past_due"
              ? date(subscription.graceEndsAt)
              : null;

    return (
        <SettingsTileGrid>
            <SettingsTile
                icon={CreditCard}
                title={t("billing.title")}
                description={t("billing.description")}
                metric={subscription?.planName ?? "—"}
                metricLabel={until ? t("billing.until", { date: until }) : undefined}
                badge={
                    subscription
                        ? {
                              label: tBilling(`status.${subscription.status}`),
                              tone: STATUS_TONE[subscription.status] ?? "muted",
                          }
                        : undefined
                }
                loading={isLoading}
                href={link(ROUTES.CRM_SETTINGS_BILLING)}
            />
        </SettingsTileGrid>
    );
}
