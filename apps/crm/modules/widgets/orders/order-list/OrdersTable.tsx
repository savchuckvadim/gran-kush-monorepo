"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Eye } from "lucide-react";

import type { SchemaOrderListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { type OrderStatus, useOrders } from "@/modules/entities/order";
import { ROUTES } from "@/modules/shared/config/routes";
import { EntityList, type EntityListTableColumn } from "@/modules/shared";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

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
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();

    const { data, isLoading, error } = useOrders({
        page,
        limit: 20,
        status: statusFilter,
    });

    const orders = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    const orderPath = (id: string) => toAppPath(`${ROUTES.CRM_ORDER_DETAILS}/${id}`);

    const statuses: OrderStatus[] = [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "completed",
        "cancelled",
    ];

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
        <div className="flex flex-wrap gap-1">
            <Button
                variant={!statusFilter ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(undefined)}
            >
                {t("allStatuses")}
            </Button>
            {statuses.map((s) => (
                <Button
                    key={s}
                    variant={statusFilter === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                >
                    {t(`status.${s}`)}
                </Button>
            ))}
        </div>
    );

    return (
        <Card className="p-4">
            <EntityList<SchemaOrderListDto>
                items={orders}
                loading={isLoading}
                error={error ? t("error") : undefined}
                emptyState={<p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>}
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
