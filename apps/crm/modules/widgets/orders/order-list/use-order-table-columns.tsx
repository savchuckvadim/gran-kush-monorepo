"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { type OrderListItem, OrderStageBadge, PaymentStatusBadge } from "@/modules/entities/order";
import {
    type EntityListTableColumn,
    personName,
    useDateTimeFormat,
    useMoneyFormat,
} from "@/modules/shared";

/** Columns of the orders table; cards reuse them as their fields. */
export function useOrderTableColumns(): EntityListTableColumn<OrderListItem>[] {
    const t = useTranslations("crm.orders.list");
    const money = useMoneyFormat();
    const dateTime = useDateTimeFormat();

    return useMemo(
        () => [
            {
                key: "orderNumber",
                header: t("colOrder"),
                cellClassName: "font-mono text-xs",
                cell: (order) => order.orderNumber,
            },
            { key: "member", header: t("colMember"), cell: (order) => personName(order.member) },
            {
                key: "stage",
                header: t("colStage"),
                cell: (order) => <OrderStageBadge stage={order.stage} />,
            },
            {
                key: "payment",
                header: t("colPayment"),
                cell: (order) => <PaymentStatusBadge status={order.paymentStatus} />,
            },
            {
                key: "total",
                header: t("colTotal"),
                headClassName: "text-right",
                cellClassName: "text-right font-mono tabular-nums",
                cell: (order) => money(order.total),
            },
            {
                key: "orderedAt",
                header: t("colDate"),
                cellClassName: "text-xs text-muted-foreground",
                cell: (order) => dateTime(order.orderedAt),
            },
        ],
        [t, money, dateTime]
    );
}
