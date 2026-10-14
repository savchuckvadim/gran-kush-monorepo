"use client";

import { useTranslations } from "next-intl";

import { ShoppingBag } from "lucide-react";

import { Card } from "@workspace/ui/components/card";

import type { OrderListItem } from "@/modules/entities/order";

import { MemberOrderRow } from "./MemberOrderRow";
import { MemberTabEmpty } from "./MemberTabEmpty";

/** The member's latest orders; a row opens the order in a slider above. */
export function MemberOrdersTab({ orders }: { orders: readonly OrderListItem[] }) {
    const t = useTranslations("crm.members.card.orders");

    if (orders.length === 0) {
        return <MemberTabEmpty icon={<ShoppingBag aria-hidden="true" />} text={t("empty")} />;
    }
    return (
        <Card className="gap-0 py-1">
            <ul className="divide-y divide-border/60">
                {orders.map((order) => (
                    <MemberOrderRow key={order.id} order={order} />
                ))}
            </ul>
        </Card>
    );
}
