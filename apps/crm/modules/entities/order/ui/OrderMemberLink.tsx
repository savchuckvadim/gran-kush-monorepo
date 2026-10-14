"use client";

import { personName } from "@/modules/shared";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

import type { OrderListItem } from "../model/order.types";

interface OrderMemberLinkProps {
    member: OrderListItem["member"];
    className?: string;
}

/** The member who ordered: a link to their card, which opens in a slider over the order. */
export function OrderMemberLink({ member, className }: OrderMemberLinkProps) {
    return (
        <EntityLink
            kind="member"
            id={member.id}
            // links are natively draggable: that would fight the card's own drag
            draggable={false}
            className={className}
        >
            {personName(member)}
        </EntityLink>
    );
}
