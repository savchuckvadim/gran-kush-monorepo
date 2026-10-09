import { getPayloadClient } from "@/modules/shared/api/payload";
import { DEFAULT_LOCALE, type Locale } from "@/modules/shared/config/locales";

import type { PlanView } from "./model";

import "server-only";

interface BillingPlanDto {
    code: string;
    priceAmount: string;
    interval: string;
}

interface BillingCatalogDto {
    plans: BillingPlanDto[];
}

// A yearly row stores what is charged once a year; the site shows the monthly equivalent.
const monthlyEquivalent = (plan: BillingPlanDto) =>
    plan.interval === "year" ? Number(plan.priceAmount) / 12 : Number(plan.priceAmount);

// The API's BillingPlan is the price the CRM bills; the CMS only holds the words around it.
const fetchBillingPrices = async (): Promise<Map<string, number>> => {
    const base = process.env.BILLING_API_URL;
    if (!base) return new Map();
    try {
        const response = await fetch(`${base.replace(/\/$/, "")}/platform/billing/plans`, {
            next: { revalidate: 300 },
        });
        if (!response.ok) return new Map();
        const { plans } = (await response.json()) as BillingCatalogDto;
        return new Map(plans.map((plan) => [plan.code, monthlyEquivalent(plan)]));
    } catch {
        return new Map();
    }
};

export const getPlans = async (locale: Locale): Promise<PlanView[]> => {
    const payload = await getPayloadClient();
    const [{ docs }, prices] = await Promise.all([
        payload.find({
            collection: "plans",
            locale,
            fallbackLocale: DEFAULT_LOCALE,
            sort: "order",
            limit: 10,
        }),
        fetchBillingPrices(),
    ]);

    const price = (code: string | null | undefined, fallback: number | null | undefined) =>
        (code ? prices.get(code) : undefined) ?? fallback ?? null;

    return docs.map((doc) => ({
        code: doc.code,
        name: doc.name,
        forWhom: doc.forWhom ?? "",
        features: (doc.features ?? []).map((feature) => feature.text),
        maxMembers: doc.maxMembers ?? null,
        highlight: Boolean(doc.highlight),
        monthly: price(doc.billing?.monthlyCode, doc.billing?.fallbackMonthly),
        yearly: price(doc.billing?.yearlyCode, doc.billing?.fallbackYearly),
        monthlyCode: doc.billing?.monthlyCode ?? null,
        yearlyCode: doc.billing?.yearlyCode ?? null,
    }));
};
