import { CabinetOrderPage } from "@/modules/pages/cabinet-orders";

export default async function CabinetOrder({
    params,
}: {
    params: Promise<{ club: string; orderId: string }>;
}) {
    const { club, orderId } = await params;
    return <CabinetOrderPage slug={club.toLowerCase()} orderId={orderId} />;
}
