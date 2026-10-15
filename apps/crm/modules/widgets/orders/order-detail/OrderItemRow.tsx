"use client";

import { useTranslations } from "next-intl";

import { Gift } from "lucide-react";

import { Badge } from "@workspace/ui";

import type { OrderItem } from "@/modules/entities/order";
import { useMoneyFormat } from "@/modules/shared";

interface OrderItemRowProps {
    item: OrderItem;
}

export function OrderItemRow({ item }: OrderItemRowProps) {
    const t = useTranslations("crm.orders.detail");
    const money = useMoneyFormat();

    return (
        <tr className="border-b last:border-b-0">
            <td className="px-3 py-2">
                {item.product.name}
                {item.isGift && (
                    <Badge variant="success" className="ml-2 gap-1 align-middle">
                        <Gift className="size-3" aria-hidden="true" />
                        {t("gift")}
                    </Badge>
                )}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
                {item.quantity} {item.product.measurementUnit?.code ?? ""}
            </td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">{money(item.unitPrice)}</td>
            <td className="px-3 py-2 text-right font-mono tabular-nums">
                {money(item.totalPrice)}
            </td>
        </tr>
    );
}
