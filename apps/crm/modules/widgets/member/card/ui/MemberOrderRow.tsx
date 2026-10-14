"use client";

import { type OrderListItem, OrderStageBadge, PaymentStatusBadge } from "@/modules/entities/order";
import { useCompactDateFormat } from "@/modules/shared/lib/use-date-format";
import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

export function MemberOrderRow({ order }: { order: OrderListItem }) {
    const money = useMoneyFormat();
    const date = useCompactDateFormat();

    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
            <EntityLink
                kind="order"
                id={order.id}
                className="font-mono text-sm font-medium underline-offset-4 hover:underline"
            >
                {order.orderNumber}
            </EntityLink>
            <span className="text-xs text-muted-foreground">{date(order.orderedAt)}</span>
            <OrderStageBadge stage={order.stage} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <span className="ml-auto text-sm font-medium tabular-nums">
                {money(Number(order.total))}
            </span>
        </li>
    );
}
