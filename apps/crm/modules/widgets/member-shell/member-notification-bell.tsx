"use client";

import { usePathname, useRouter } from "next/navigation";

import { useCabinetLinks } from "@/modules/processes/member-auth";
import { getClubSlugFromPath } from "@/modules/shared/config/club-routes";
import { NotificationBell } from "@/modules/widgets/notification-bell";

/** Колокольчик участника — в клубе, который открыт; на главной кабинета клуба нет, нет и уведомлений. */
export function MemberNotificationBell() {
    const pathname = usePathname();
    const router = useRouter();
    const links = useCabinetLinks();
    const club = getClubSlugFromPath(pathname);
    if (!club) return null;

    return (
        <NotificationBell
            app="cabinet"
            club={club}
            onOpen={({ subjectKind, subjectId }) => {
                if (subjectKind === "order") router.push(links.clubOrder(club, subjectId));
            }}
        />
    );
}
