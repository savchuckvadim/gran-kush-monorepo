import { CabinetOrdersPage } from "@/modules/pages/cabinet-orders";

export default async function CabinetOrders({ params }: { params: Promise<{ club: string }> }) {
    const { club } = await params;
    return <CabinetOrdersPage slug={club.toLowerCase()} />;
}
