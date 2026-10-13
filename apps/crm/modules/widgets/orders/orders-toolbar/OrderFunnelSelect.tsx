"use client";

import { useTranslations } from "next-intl";

import { FieldSelect } from "@workspace/ui";

import type { OrderFunnel } from "@/modules/entities/order";

interface OrderFunnelSelectProps {
    funnels: readonly OrderFunnel[];
    value: string;
    onChange: (funnelId: string) => void;
}

/** Shown only when the club has more than one order funnel. */
export function OrderFunnelSelect({ funnels, value, onChange }: OrderFunnelSelectProps) {
    const t = useTranslations("crm.orders");
    if (funnels.length < 2) return null;

    return (
        <FieldSelect
            size="sm"
            aria-label={t("funnel")}
            className="w-auto min-w-40"
            options={funnels.map((funnel) => ({ value: funnel.id, label: funnel.name }))}
            value={value}
            onValueChange={onChange}
        />
    );
}
