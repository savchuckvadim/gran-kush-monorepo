import { CabinetClubPage } from "@/modules/pages/cabinet";

export default async function CabinetClub({ params }: { params: Promise<{ club: string }> }) {
    const { club } = await params;
    return <CabinetClubPage slug={club.toLowerCase()} />;
}
