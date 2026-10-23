import { redirect } from "next/navigation";

import { CabinetClubPage } from "@/modules/pages/cabinet";
import { brandHas } from "@/modules/shared/config/brand";

/** Главная клуба — QR для двери; где двери нет (студии), раздел открывается витриной. */
export default async function CabinetClub({
    params,
}: {
    params: Promise<{ locale: string; club: string }>;
}) {
    const { locale, club } = await params;
    const slug = club.toLowerCase();
    if (!brandHas("presence")) {
        redirect(`/${locale}/${slug}/shop`);
    }
    return <CabinetClubPage slug={slug} />;
}
