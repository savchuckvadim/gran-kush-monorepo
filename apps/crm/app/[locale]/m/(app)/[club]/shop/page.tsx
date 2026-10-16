import { CabinetShopPage } from "@/modules/pages/cabinet-shop";

export default async function CabinetShop({ params }: { params: Promise<{ club: string }> }) {
    const { club } = await params;
    return <CabinetShopPage slug={club.toLowerCase()} />;
}
