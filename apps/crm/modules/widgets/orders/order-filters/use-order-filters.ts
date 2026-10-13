"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import {
    isPaymentStatus,
    type OrderFunnelStage,
    type OrdersFilter,
    PAYMENT_STATUSES,
    stageColor,
} from "@/modules/entities/order";
import { type EntityFilterField, useEntityFilterParams } from "@/modules/shared";

const STAGE_KEY = "stage";
const PAYMENT_KEY = "payment";
const DATE_KEY = "date";

/** A local calendar day as an ISO bound of `orderedAt`. */
const dayBound = (day: string | undefined, isEnd: boolean): string | undefined =>
    day ? new Date(`${day}T${isEnd ? "23:59:59.999" : "00:00:00"}`).toISOString() : undefined;

interface UseOrderFiltersOptions {
    /** The list filters by stage; the kanban does not — its columns are the stages */
    withStage: boolean;
}

/** Filter fields and their state in the address, shared by the list and the kanban. */
export function useOrderFilters(
    stages: readonly OrderFunnelStage[],
    { withStage }: UseOrderFiltersOptions
) {
    const t = useTranslations("crm.orders");

    const fields = useMemo<EntityFilterField[]>(() => {
        const stageField: EntityFilterField = {
            key: STAGE_KEY,
            label: t("stage.label"),
            type: "select",
            isDefault: true,
            options: stages.map((stage) => ({
                value: stage.id,
                label: stage.name,
                color: stageColor(stage),
            })),
        };
        const rest: EntityFilterField[] = [
            {
                key: PAYMENT_KEY,
                label: t("list.colPayment"),
                type: "select",
                isDefault: true,
                options: PAYMENT_STATUSES.map((status) => ({
                    value: status,
                    label: t(`list.payment.${status}`),
                })),
            },
            { key: DATE_KEY, label: t("list.colDate"), type: "date", isDefault: true },
        ];
        return withStage ? [stageField, ...rest] : rest;
    }, [stages, t, withStage]);

    const { state, setState, page, setPage } = useEntityFilterParams(fields);

    const filter = useMemo<OrdersFilter>(() => {
        const payment = state.values[PAYMENT_KEY];
        const date = state.values[DATE_KEY];
        const period = typeof date === "object" && !Array.isArray(date) ? date : undefined;
        return {
            search: state.q || undefined,
            paymentStatus: isPaymentStatus(payment) ? payment : undefined,
            startDate: dayBound(period?.from, false),
            endDate: dayBound(period?.to, true),
        };
    }, [state]);

    const stageValue = state.values[STAGE_KEY];
    const stageId = withStage && typeof stageValue === "string" ? stageValue : undefined;

    return { fields, state, setState, page, setPage, filter, stageId };
}

export type OrderFilters = ReturnType<typeof useOrderFilters>;
