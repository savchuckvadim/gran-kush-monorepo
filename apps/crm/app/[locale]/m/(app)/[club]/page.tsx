import { notFound } from "next/navigation";

import { CabinetClubPage } from "@/modules/pages/cabinet";
import { isReservedClubSlug } from "@/modules/shared/config/club-routes";

export default async function CabinetClub({ params }: { params: Promise<{ club: string }> }) {
    const { club } = await params;
    // Служебные слова (`scan`, `crm`, …) не клубы: страницы клуба для них не существует
    if (isReservedClubSlug(club)) {
        notFound();
    }
    return <CabinetClubPage slug={club.toLowerCase()} />;
}
