"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { ChevronsUpDown, LayoutGrid } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useMyMemberships } from "@/modules/entities/membership";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { getClubSlugFromPath } from "@/modules/shared/config/club-routes";
import { ClubBadge } from "@/modules/shared/ui/Brand";
import { ClubMenu } from "@/modules/shared/ui/ClubMenu";

/**
 * Клуб, в котором находится участник, и переход в другой клуб. Список — подтверждённые и
 * действующие членства; ожидающие подтверждения и закрытые здесь не показываются.
 */
export function ClubSwitcher({ className }: { className?: string }) {
    const t = useTranslations("cabinet.shell");
    const router = useRouter();
    const pathname = usePathname();
    const links = useCabinetLinks();
    const { data: memberships = [] } = useMyMemberships();

    const clubs = memberships.filter((m) => m.consentStatus === "confirmed" && m.isActive);
    const currentSlug = getClubSlugFromPath(pathname);
    const current = clubs.find((club) => club.slug === currentSlug);
    const label = current?.displayName ?? t("allClubs");

    return (
        <ClubMenu
            title={t("yourClubs")}
            texts={{ empty: t("noClubs") }}
            clubs={clubs.map((club) => ({
                id: club.slug,
                name: club.displayName,
                current: club.slug === currentSlug,
            }))}
            onSelect={(slug) => router.push(links.club(slug))}
            actions={[{ label: t("manageClubs"), href: links.clubs }]}
            trigger={
                <Button
                    variant="ghost"
                    data-slot="club-switcher"
                    className={cn("max-w-[14rem] min-w-0 shrink gap-2 px-2", className)}
                >
                    {current ? (
                        <ClubBadge name={label} />
                    ) : (
                        <span
                            aria-hidden="true"
                            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                        >
                            <LayoutGrid className="size-4" />
                        </span>
                    )}
                    <span className="truncate text-sm font-semibold">{label}</span>
                    <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
                </Button>
            }
        />
    );
}
