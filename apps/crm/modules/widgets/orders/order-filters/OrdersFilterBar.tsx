"use client";

import { useTranslations } from "next-intl";

import { EntityFilter } from "@/modules/shared";

import type { OrderFilters } from "./use-order-filters";

interface OrdersFilterBarProps {
    filters: OrderFilters;
    total?: number;
    isFetching?: boolean;
}

/** Search by number, payment and dates (and the stage in the list) — the same bar in both views. */
export function OrdersFilterBar({ filters, total, isFetching }: OrdersFilterBarProps) {
    const t = useTranslations("crm.orders.list");

    return (
        <EntityFilter
            fields={filters.fields}
            state={filters.state}
            onChange={filters.setState}
            total={total}
            isFetching={isFetching}
            storageKey="crm-orders"
            searchPlaceholder={t("searchPlaceholder")}
        />
    );
}
