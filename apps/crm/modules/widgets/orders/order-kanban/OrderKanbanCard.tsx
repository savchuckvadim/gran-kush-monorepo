"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { InitialsAvatar } from "@workspace/ui";

import {
    type OrderListItem,
    OrderMemberLink,
    PaymentStatusBadge,
    stageColor,
} from "@/modules/entities/order";
import { personName, useCompactDateFormat, useMoneyFormat } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

interface OrderKanbanCardProps {
    order: OrderListItem;
}

/** A kanban card: number, total, member, items and time; a stripe in the stage colour on the left. */
export function OrderKanbanCard({ order }: OrderKanbanCardProps) {
    const t = useTranslations("crm.orders.kanban");
    const money = useMoneyFormat();
    const date = useCompactDateFormat();
    const toAppPath = useLocalizedLink();
    const employee = order.employee ? personName(order.employee, "") : "";

    return (
        <article
            data-slot="order-card"
            className="rounded-xl border-l-4 bg-card p-3 text-sm text-card-foreground shadow-sm"
            style={{ borderLeftColor: order.stage ? stageColor(order.stage) : undefined }}
        >
            <div className="flex items-start justify-between gap-2">
                <Link
                    href={toAppPath(`${ROUTES.CRM_ORDER_DETAILS}/${order.id}`)}
                    draggable={false}
                    className="font-mono text-xs font-semibold hover:underline"
                >
                    {order.orderNumber}
                </Link>
                <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            <p className="mt-1 text-base font-semibold tabular-nums">{money(order.total)}</p>
            <OrderMemberLink
                member={order.member}
                className="mt-0.5 block truncate text-primary hover:underline"
            />
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{t("items", { count: order.itemsCount })}</span>
                <span className="flex items-center gap-2">
                    <time dateTime={order.orderedAt}>{date(order.orderedAt)}</time>
                    {employee ? <InitialsAvatar name={employee} /> : null}
                </span>
            </div>
        </article>
    );
}
