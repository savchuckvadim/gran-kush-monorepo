"use client";

import { useTranslations } from "next-intl";

import { ShoppingCart } from "lucide-react";

import type { OrderFunnel } from "@/modules/entities/order";

import { OrderFunnelSelect } from "./OrderFunnelSelect";
import { OrdersViewSwitch } from "./OrdersViewSwitch";
import type { OrdersView } from "./use-orders-view";

interface OrdersPageHeaderProps {
    view: OrdersView;
    onViewChange: (view: OrdersView) => void;
    funnels: readonly OrderFunnel[];
    funnel: OrderFunnel | undefined;
    onFunnelChange: (funnelId: string) => void;
}

export function OrdersPageHeader({
    view,
    onViewChange,
    funnels,
    funnel,
    onFunnelChange,
}: OrdersPageHeaderProps) {
    const t = useTranslations("crm.orders");

    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    <ShoppingCart className="size-6" aria-hidden="true" />
                    {t("title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {funnel ? (
                    <OrderFunnelSelect
                        funnels={funnels}
                        value={funnel.id}
                        onChange={onFunnelChange}
                    />
                ) : null}
                <OrdersViewSwitch value={view} onChange={onViewChange} />
            </div>
        </div>
    );
}
