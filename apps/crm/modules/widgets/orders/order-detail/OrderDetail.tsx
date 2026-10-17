"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { Card } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { funnelOfOrder, useOrderDetail, useOrderFunnels } from "@/modules/entities/order";
import { OrderStageBar } from "@/modules/features/order-stage";

import { OrderDetailHeader } from "./OrderDetailHeader";
import { OrderItemsCard } from "./OrderItemsCard";
import { OrderPaymentCard } from "./OrderPaymentCard";
import { OrderSummaryCard } from "./OrderSummaryCard";

interface OrderDetailProps {
    orderId: string;
    /** In a slider the panel closes instead of a back button */
    layout?: "page" | "slider";
}

/** The order card: the stage bar across the top, details and payment on the left, items on the right. */
export function OrderDetail({ orderId, layout = "page" }: OrderDetailProps) {
    const t = useTranslations("crm.orders.detail");
    const { data: order, isLoading, error } = useOrderDetail(orderId);
    const { data: funnels = [] } = useOrderFunnels();
    const { can } = usePermissions();
    const canProcess = can("orders.process");

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (error || !order) {
        return (
            <Card className="p-6">
                <p className="text-destructive">{t("error")}</p>
            </Card>
        );
    }

    const funnel = funnelOfOrder(funnels, order.stage);

    return (
        <div className="space-y-4">
            <OrderDetailHeader order={order} showBack={layout === "page"} />
            {funnel ? <OrderStageBar order={order} funnel={funnel} canMove={canProcess} /> : null}
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="space-y-4 lg:col-span-2">
                    <OrderSummaryCard order={order} />
                    <OrderPaymentCard order={order} canEdit={canProcess} />
                </div>
                <OrderItemsCard items={order.items} className="lg:col-span-3" />
            </div>
        </div>
    );
}
