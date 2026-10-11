"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/modules/shared/ui/Badge";

import type { SubscriptionStatus } from "../api";
import { SUBSCRIPTION_STATUS_TONES } from "../model";

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | null }) {
    const t = useTranslations("billing");

    if (!status) {
        return <Badge>{t("clubs.noSubscription")}</Badge>;
    }
    return <Badge tone={SUBSCRIPTION_STATUS_TONES[status]}>{t(`status.${status}`)}</Badge>;
}
