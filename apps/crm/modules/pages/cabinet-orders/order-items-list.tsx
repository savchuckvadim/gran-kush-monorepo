"use client";

import { useTranslations } from "next-intl";

import { Gift } from "lucide-react";

import type { SchemaCabinetOrderItemDto } from "@workspace/api-client/core";

import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";

/** Позиции заказа: количество, цена за единицу и сумма; подарок клуба отмечен отдельно. */
export function OrderItemsList({ items }: { items: readonly SchemaCabinetOrderItemDto[] }) {
    const t = useTranslations("cabinet.orders");
    const money = useMoneyFormat();
    return (
        <ul className="divide-y">
            {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                    <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground tabular-nums">
                            {item.quantity}
                            {item.unitCode ? ` ${item.unitCode}` : ""} × {money(item.unitPrice)}
                        </p>
                    </div>
                    {item.isGift ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Gift className="size-4" aria-hidden="true" />
                            {t("gift")}
                        </span>
                    ) : (
                        <span className="font-medium tabular-nums">{money(item.totalPrice)}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}
