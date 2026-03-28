"use client";

import { useParams } from "next/navigation";

import { OrderDetailCard } from "@/modules/widgets/orders";

export default function CrmOrderDetailPage() {
    const params = useParams();
    const id = params.id as string;

    return <OrderDetailCard orderId={id} />;
}
