"use client";

import { useLocale } from "next-intl";

import { useMutation, useQuery } from "@tanstack/react-query";

import { assertOpenApiOk } from "@workspace/api-client/core";

import { usePortal } from "@/modules/processes";
import { $api } from "@/modules/shared";

import { toMailLocale } from "../auth/lib/credentials";

export const billingKeys = {
    overview: (portalSlug: string | null, plan: string | null) =>
        ["crm-billing", portalSlug, plan] as const,
};

/** Сколько раз переспросить статус после возврата из Stripe: ~1 минута по 3 секунды. */
const MAX_POLLS_AFTER_CHECKOUT = 20;

/**
 * `plan` — скрытый тариф из ссылки ?plan=…: API добавит его в список выбора.
 * `afterCheckout` — вернулись из Stripe: статус обновит вебхук, поэтому спрашиваем чаще,
 * пока подписка не станет Stripe-подпиской.
 */
export function useBillingOverview(plan: string | null, afterCheckout: boolean) {
    const { portalSlug } = usePortal();
    return useQuery({
        queryKey: billingKeys.overview(portalSlug, plan),
        queryFn: async () =>
            assertOpenApiOk(
                await $api.GET("/crm/billing", {
                    params: { query: plan ? { plan } : {} },
                })
            ),
        refetchInterval: (query) =>
            afterCheckout &&
            query.state.data?.subscription.provider !== "stripe" &&
            query.state.dataUpdateCount < MAX_POLLS_AFTER_CHECKOUT
                ? 3000
                : false,
        retry: false,
    });
}

/** Оплата и кабинет живут у Stripe: API отдаёт адрес, мы уходим на него. */
export function useBillingRedirect() {
    const locale = useLocale();
    const mailLocale = toMailLocale(locale);

    const checkout = useMutation({
        mutationFn: async (planCode: string) =>
            assertOpenApiOk(
                await $api.POST("/crm/billing/checkout", {
                    body: { planCode, locale: mailLocale },
                })
            ),
        onSuccess: ({ url }) => window.location.assign(url),
    });

    const manage = useMutation({
        mutationFn: async () =>
            assertOpenApiOk(
                await $api.POST("/crm/billing/manage", { body: { locale: mailLocale } })
            ),
        onSuccess: ({ url }) => window.location.assign(url),
    });

    return { checkout, manage };
}
