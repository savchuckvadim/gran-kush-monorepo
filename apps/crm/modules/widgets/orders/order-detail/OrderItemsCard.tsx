"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import type { OrderDetail } from "@/modules/entities/order";

import { OrderItemRow } from "./OrderItemRow";

interface OrderItemsCardProps {
    items: OrderDetail["items"];
    className?: string;
}

export function OrderItemsCard({ items, className }: OrderItemsCardProps) {
    const t = useTranslations("crm.orders.detail");

    return (
        <Card className={cn("p-5", className)}>
            <h2 className="mb-3 text-base font-medium">{t("items")}</h2>
            {items.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-medium">{t("colProduct")}</th>
                                <th className="px-3 py-2 text-right font-medium">{t("colQty")}</th>
                                <th className="px-3 py-2 text-right font-medium">
                                    {t("colPrice")}
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                    {t("colItemTotal")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item) => (
                                <OrderItemRow key={item.id} item={item} />
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">{t("noItems")}</p>
            )}
        </Card>
    );
}
