"use client";

import Link from "next/link";

import { personName } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import type { OrderListItem } from "../model/order.types";

interface OrderMemberLinkProps {
    member: OrderListItem["member"];
    className?: string;
}

/** The member who ordered, a link to their card (as the contact on a Bitrix24 deal card). */
export function OrderMemberLink({ member, className }: OrderMemberLinkProps) {
    const toAppPath = useLocalizedLink();

    return (
        <Link
            href={toAppPath(`${ROUTES.CRM_MEMBER_DETAILS}/${member.id}`)}
            // links are natively draggable: that would fight the card's own drag
            draggable={false}
            className={className}
        >
            {personName(member)}
        </Link>
    );
}
