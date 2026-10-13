"use client";

import type { OrderItem } from "@/modules/entities/order";
import { useMoneyFormat } from "@/modules/shared";

interface OrderItemRowProps {
    item: OrderItem;
}

export function OrderItemRow({ item }: OrderItemRowProps) {
    const money = useMoneyFormat();

    return (
        <tr className="border-b last:border-b-0">
            <td className="px-3 py-2">{item.product.name}</td>
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
