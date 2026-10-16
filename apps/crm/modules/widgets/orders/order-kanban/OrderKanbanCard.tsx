"use client";

import { useTranslations } from "next-intl";

import { InitialsAvatar } from "@workspace/ui";

import {
    type MovableOrder,
    type OrderFunnelStage,
    type OrderListItem,
    OrderMemberLink,
    PaymentStatusBadge,
} from "@/modules/entities/order";
import { NextStageButton } from "@/modules/features/order-stage";
import { personName, useCompactDateFormat, useMoneyFormat } from "@/modules/shared";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

import type { OrderCardField } from "./card-fields";

interface OrderKanbanCardProps {
    order: OrderListItem;
    /** Что показывать: набор из шестерёнки над доской */
    fields: readonly OrderCardField[];
    /** Следующая стадия воронки; без неё кнопка «дальше» не показывается */
    next?: OrderFunnelStage;
    onMoveNext?: (order: MovableOrder, target: OrderFunnelStage) => void;
}

/** A kanban card: the number always, the rest by the board's field settings. */
export function OrderKanbanCard({ order, fields, next, onMoveNext }: OrderKanbanCardProps) {
    const t = useTranslations("crm.orders.kanban");
    const money = useMoneyFormat();
    const date = useCompactDateFormat();
    const show = (field: OrderCardField) => fields.includes(field);
    const employee = order.employee ? personName(order.employee, "") : "";
    const footer = show("items") || show("date") || (show("employee") && employee);
    const showNext = show("nextStage") && next && onMoveNext;

    return (
        <article
            data-slot="order-card"
            className="rounded-xl bg-card p-3 text-sm text-card-foreground shadow-sm"
        >
            <div className="flex items-start justify-between gap-2">
                <EntityLink
                    kind="order"
                    id={order.id}
                    draggable={false}
                    className="font-mono text-xs font-semibold hover:underline"
                >
                    {order.orderNumber}
                </EntityLink>
                {show("payment") && <PaymentStatusBadge status={order.paymentStatus} />}
            </div>
            {show("total") && (
                <p className="mt-1 text-lg font-bold tracking-tight tabular-nums">
                    {money(order.total)}
                </p>
            )}
            {show("member") && (
                <OrderMemberLink
                    member={order.member}
                    className="mt-0.5 block truncate font-medium hover:underline"
                />
            )}
            {footer && (
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                        {[
                            show("items") ? t("items", { count: order.itemsCount }) : null,
                            show("date") ? date(order.orderedAt) : null,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </span>
                    {show("employee") && employee ? <InitialsAvatar name={employee} /> : null}
                </div>
            )}
            {showNext && (
                <div className="mt-2 flex justify-end">
                    <NextStageButton order={order} next={next} onMove={onMoveNext} variant="chip" />
                </div>
            )}
        </article>
    );
}
