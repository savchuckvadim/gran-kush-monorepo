"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { type OrderDetail, OrderMemberLink } from "@/modules/entities/order";
import { personName, useMoneyFormat } from "@/modules/shared";

import { OrderInfoRow } from "./OrderInfoRow";

interface OrderSummaryCardProps {
    order: OrderDetail;
}

/** Who ordered, who handles it, the amounts (net and tax when the club keeps finance) and the notes. */
export function OrderSummaryCard({ order }: OrderSummaryCardProps) {
    const t = useTranslations("crm.orders.detail");
    const money = useMoneyFormat();
    const employee = order.employee ? personName(order.employee, "") : "";

    return (
        <Card className="p-5">
            <h2 className="mb-3 text-base font-medium">{t("info")}</h2>
            <dl className="space-y-2">
                <OrderInfoRow label={t("member")}>
                    <OrderMemberLink
                        member={order.member}
                        className="text-primary hover:underline"
                    />
                </OrderInfoRow>
                {employee ? <OrderInfoRow label={t("employee")}>{employee}</OrderInfoRow> : null}
                <OrderInfoRow label={t("subtotal")}>{money(order.subtotal)}</OrderInfoRow>
                <OrderInfoRow label={t("discount")}>{money(order.discount)}</OrderInfoRow>
                {order.taxTotal !== null && order.netTotal !== null ? (
                    <>
                        <OrderInfoRow label={t("net")}>{money(order.netTotal)}</OrderInfoRow>
                        <OrderInfoRow label={t("tax")}>{money(order.taxTotal)}</OrderInfoRow>
                    </>
                ) : null}
                <OrderInfoRow label={t("total")}>
                    <span className="text-base">{money(order.total)}</span>
                </OrderInfoRow>
                {order.notes ? <OrderInfoRow label={t("notes")}>{order.notes}</OrderInfoRow> : null}
                {order.adminNotes ? (
                    <OrderInfoRow label={t("adminNotes")}>{order.adminNotes}</OrderInfoRow>
                ) : null}
            </dl>
        </Card>
    );
}
