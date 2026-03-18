"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";

import type { SchemaOrderListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { type OrderStatus,useOrders } from "@/modules/entities/order";

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

interface OrderRowProps {
    order: SchemaOrderListDto;
    locale: string;
}

function OrderRow({ order, locale }: OrderRowProps) {
    const t = useTranslations("crm.orders.list");

    const memberName = order.member
        ? `${order.member.name} ${order.member.surname ?? ""}`.trim()
        : "—";

    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2 font-mono text-xs">{order.orderNumber}</td>
            <td className="px-3 py-2">{memberName}</td>
            <td className="px-3 py-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                        STATUS_COLORS[order.status] ?? "bg-muted text-muted-foreground"
                    }`}
                >
                    {t(`status.${order.status}`)}
                </span>
            </td>
            <td className="px-3 py-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                        PAYMENT_COLORS[order.paymentStatus] ?? "bg-muted text-muted-foreground"
                    }`}
                >
                    {t(`payment.${order.paymentStatus}`)}
                </span>
            </td>
            <td className="px-3 py-2 text-right font-mono">€{order.total}</td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(order.orderedAt).toLocaleString()}
            </td>
            <td className="px-3 py-2">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${locale}/crm/orders/${order.id}`}>
                        <Eye className="h-3.5 w-3.5" />
                    </Link>
                </Button>
            </td>
        </tr>
    );
}

interface OrdersTableProps {
    locale: string;
}

export function OrdersTable({ locale }: OrdersTableProps) {
    const t = useTranslations("crm.orders.list");
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<OrderStatus | undefined>();

    const { data, isLoading, error } = useOrders({
        page,
        limit: 20,
        status: statusFilter,
    });

    const orders = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    const statuses: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

    return (
        <Card className="p-4">
            {/* Фильтры по статусу */}
            <div className="mb-4 flex flex-wrap gap-1">
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

            {isLoading && (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            )}

            {error && <p className="py-4 text-sm text-destructive">{t("error")}</p>}

            {!isLoading && !error && orders.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}

            {orders.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">{t("colOrder")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colMember")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colPayment")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colTotal")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colDate")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colActions")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => (
                                    <OrderRow key={order.id} order={order} locale={locale} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {t("page")} {page} / {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
