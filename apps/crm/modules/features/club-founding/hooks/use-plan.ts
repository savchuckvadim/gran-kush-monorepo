"use client";

import { useSearchParams } from "next/navigation";

import { useQuery } from "@tanstack/react-query";

import { $api } from "@/modules/shared";

import { PORTAL_SLUG_MAX, PORTAL_SLUG_PATTERN } from "../lib/portal-slug";

/** The product site passes the API billing code: `…/auth/register?plan=club-month`. */
export const usePlanFromUrl = (): string | undefined => {
    const plan = useSearchParams().get("plan");
    return plan && plan.length <= PORTAL_SLUG_MAX && PORTAL_SLUG_PATTERN.test(plan)
        ? plan
        : undefined;
};

/** Name of the chosen plan to show above the form; `null` while unknown. */
export const usePlanName = (planCode: string | undefined) =>
    useQuery({
        queryKey: ["billing-plans"],
        enabled: Boolean(planCode),
        queryFn: () => $api.GET("/platform/billing/plans"),
        select: (response) =>
            response.data?.plans.find((plan) => plan.code === planCode)?.name ?? null,
    });
