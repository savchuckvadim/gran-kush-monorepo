"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";

/**
 * 503 и 409 у админ-биллинга означают понятные ситуации — показываем их словами,
 * остальное как прислал API.
 */
export const useBillingErrorMessage = (context: "plan" | "subscription") => {
    const t = useTranslations("billing.errors");

    return useCallback(
        (error: unknown): string => {
            const status = error instanceof ApiClientError ? error.status : null;
            if (status === 503) return t("stripeNotConfigured");
            if (status === 409) return context === "plan" ? t("planExists") : t("stripeManaged");
            return getApiErrorMessage(error);
        },
        [context, t]
    );
};
