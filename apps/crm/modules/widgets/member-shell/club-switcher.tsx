"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Check, ChevronsUpDown, LayoutGrid } from "lucide-react";

import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useMyMemberships } from "@/modules/entities/membership";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { getClubSlugFromPath } from "@/modules/shared/config/club-routes";
import { ClubBadge } from "@/modules/shared/ui/Brand";

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
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    data-slot="club-switcher"
                    className={cn("max-w-[14rem] gap-2 px-2", className)}
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
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
                <DropdownMenuLabel>{t("yourClubs")}</DropdownMenuLabel>
                {clubs.length === 0 && (
                    <p className="px-2 py-1.5 text-sm text-muted-foreground">{t("noClubs")}</p>
                )}
                {clubs.map((club) => (
                    <DropdownMenuItem
                        key={club.memberId}
                        onSelect={() => router.push(links.club(club.slug))}
                        className="gap-2"
                    >
                        <ClubBadge name={club.displayName} />
                        <span className="min-w-0 flex-1 truncate">{club.displayName}</span>
                        {club.slug === currentSlug && (
                            <Check className="size-4 shrink-0" aria-hidden="true" />
                        )}
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push(links.clubs)}>
                    {t("manageClubs")}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
