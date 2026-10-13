import { OrderDetailPage } from "@/modules/pages/orders";

export default async function CrmOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <OrderDetailPage orderId={id} />;
}
