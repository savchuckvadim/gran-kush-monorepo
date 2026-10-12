"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Eye } from "lucide-react";

import type { SchemaOrderListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { type OrderStatus, type PaymentStatus, useOrders } from "@/modules/entities/order";
import {
    EntityFilter,
    type EntityFilterField,
    EntityList,
    type EntityListTableColumn,
    useEntityFilterParams,
} from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const STATUSES: OrderStatus[] = [
    "pending",
    "confirmed",
    "preparing",
    "ready",
    "completed",
    "cancelled",
];
const PAYMENTS: PaymentStatus[] = ["pending", "paid", "refunded"];

/** A local calendar day as an ISO bound of `orderedAt`. */
const dayBound = (day: string | undefined, isEnd: boolean): string | undefined =>
    day ? new Date(`${day}T${isEnd ? "23:59:59.999" : "00:00:00"}`).toISOString() : undefined;

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-700",
    confirmed: "bg-blue-500/10 text-blue-700",
    preparing: "bg-indigo-500/10 text-indigo-700",
    ready: "bg-green-500/10 text-green-700",
    completed: "bg-gray-500/10 text-gray-700",
    cancelled: "bg-red-500/10 text-red-700",
};

const PAYMENT_COLORS: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-700",
    paid: "bg-green-500/10 text-green-700",
    refunded: "bg-red-500/10 text-red-700",
};

export function OrdersTable() {
    const t = useTranslations("crm.orders.list");
    const toAppPath = useLocalizedLink();

    const fields = useMemo<EntityFilterField[]>(
        () => [
            {
                key: "status",
                label: t("colStatus"),
                type: "select",
                isDefault: true,
                options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
            },
            {
                key: "payment",
                label: t("colPayment"),
                type: "select",
                isDefault: true,
                options: PAYMENTS.map((p) => ({ value: p, label: t(`payment.${p}`) })),
            },
            { key: "date", label: t("colDate"), type: "date", isDefault: true },
        ],
        [t]
    );
    const { state, setState, page, setPage } = useEntityFilterParams(fields);
    const { status, payment, date } = state.values;
    const period = typeof date === "object" && !Array.isArray(date) ? date : undefined;

    const { data, isLoading, isFetching, error } = useOrders({
        page,
        limit: 20,
        search: state.q,
        status: typeof status === "string" ? (status as OrderStatus) : undefined,
        paymentStatus: typeof payment === "string" ? (payment as PaymentStatus) : undefined,
        startDate: dayBound(period?.from, false),
        endDate: dayBound(period?.to, true),
    });

    const orders = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    const orderPath = (id: string) => toAppPath(`${ROUTES.CRM_ORDER_DETAILS}/${id}`);

    const tableColumns = [
        {
            key: "orderNumber",
            header: t("colOrder"),
            cellClassName: "font-mono text-xs",
            cell: (order: SchemaOrderListDto) => order.orderNumber,
        },
        {
            key: "member",
            header: t("colMember"),
            cell: (order: SchemaOrderListDto) => {
                const memberName = order.member
                    ? `${order.member.name} ${order.member.surname ?? ""}`.trim()
                    : "—";
                return memberName;
            },
        },
        {
            key: "status",
            header: t("colStatus"),
            cell: (order: SchemaOrderListDto) => (
                <span
                    data-slot="badge"
                    className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"
                    }`}
                >
                    {t(`status.${order.status}`)}
                </span>
            ),
        },
        {
            key: "payment",
            header: t("colPayment"),
            cell: (order: SchemaOrderListDto) => (
                <span
                    data-slot="badge"
                    className={`rounded-full px-2 py-0.5 text-xs ${
                        PAYMENT_COLORS[order.paymentStatus] ?? "bg-muted text-muted-foreground"
                    }`}
                >
                    {t(`payment.${order.paymentStatus}`)}
                </span>
            ),
        },
        {
            key: "total",
            header: t("colTotal"),
            headClassName: "text-right",
            cellClassName: "text-right font-mono",
            cell: (order: SchemaOrderListDto) => `€${order.total}`,
        },
        {
            key: "orderedAt",
            header: t("colDate"),
            cellClassName: "text-xs text-muted-foreground",
            cell: (order: SchemaOrderListDto) => new Date(order.orderedAt).toLocaleString(),
        },
    ] as EntityListTableColumn<SchemaOrderListDto>[];

    const filterSlot = (
        <EntityFilter
            fields={fields}
            state={state}
            onChange={setState}
            total={data?.total}
            isFetching={isFetching}
            storageKey="crm-orders"
            searchPlaceholder={t("searchPlaceholder")}
        />
    );

    return (
        <Card className="p-4">
            <EntityList<SchemaOrderListDto>
                items={orders}
                loading={isLoading}
                error={error ? t("error") : undefined}
                emptyState={
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
                }
                getRowKey={(o) => o.id}
                filterSlot={filterSlot}
                tableColumns={tableColumns}
                defaultViewMode="table"
                visibilityStorageKey="crm-orders-list"
                viewModeStorageKey="crm-orders-list"
                renderRowActions={(order) => (
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={orderPath(order.id)}>
                            <Eye className="h-3.5 w-3.5" />
                        </Link>
                    </Button>
                )}
                pagination={{
                    page,
                    totalPages,
                    onPageChange: setPage,
                }}
            />
        </Card>
    );
}
