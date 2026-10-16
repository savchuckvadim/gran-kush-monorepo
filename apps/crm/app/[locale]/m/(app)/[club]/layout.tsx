import { notFound } from "next/navigation";

import { isReservedClubSlug } from "@/modules/shared/config/club-routes";
import { CabinetClubLayout } from "@/modules/widgets/cabinet-club";

/** Служебные слова (`scan`, `crm`, …) не клубы: раздела клуба для них не существует. */
export default async function CabinetClubSection({
    params,
    children,
}: {
    params: Promise<{ club: string }>;
    children: React.ReactNode;
}) {
    const { club } = await params;
    if (isReservedClubSlug(club)) {
        notFound();
    }
    return <CabinetClubLayout slug={club.toLowerCase()}>{children}</CabinetClubLayout>;
}
