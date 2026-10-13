"use client";

import { OrderDetail } from "@/modules/widgets/orders";

export function OrderDetailPage({ orderId }: { orderId: string }) {
    return <OrderDetail orderId={orderId} />;
}
