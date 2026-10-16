"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

import type { SchemaMyPortalDto } from "@workspace/api-client/core";
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

import { usePortalInfo } from "@/modules/entities/portal";
import { usePortal } from "@/modules/processes";
import { $api } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { ClubBadge } from "@/modules/shared/ui/Brand";
import { useSidebarPinned } from "@/modules/shared/ui/Sidebar";

function useMyPortals(enabled: boolean) {
    return useQuery({
        queryKey: ["crm-my-portals"],
        enabled,
        queryFn: () => $api.GET("/crm/my-portals"),
        select: (response) => (response.data?.portals ?? []) as SchemaMyPortalDto[],
    });
}

/**
 * Текущий клуб и переход в другой клуб сотрудника. Бренд PafPaf виден в меню, только пока оно
 * закреплено раскрытым на широком экране; когда меню свёрнуто, название клуба в шапке встаёт на
 * место бренда: без значка и стрелки, крупным начертанием. Выбор клуба по клику остаётся.
 */
export function PortalSwitcher({ className }: { className?: string }) {
    const t = useTranslations("crm.shell.club");
    const router = useRouter();
    const locale = useLocale();
    const queryClient = useQueryClient();
    const { portalSlug } = usePortal();
    const [pinned] = useSidebarPinned();
    const [isOpen, setIsOpen] = useState(false);
    const { data: info } = usePortalInfo();
    const { data: portals = [], isLoading } = useMyPortals(isOpen);

    const label = info?.displayName ?? portalSlug ?? t("fallback");

    function selectPortal(slug: string) {
        if (slug === portalSlug) return;
        // Многие query-ключи не содержат slug (members, orders, products):
        // без очистки новый клуб секунду показывает данные предыдущего
        queryClient.clear();
        router.push(`/${locale}/${slug}/crm`);
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn("min-w-0 gap-2 pl-1.5 pr-2 font-semibold", className)}
                >
                    <ClubBadge
                        name={label}
                        className={cn(
                            "size-6 text-[0.625rem]",
                            pinned ? "hidden lg:flex" : "hidden"
                        )}
                    />
                    <span
                        className={cn(
                            "max-w-28 truncate text-lg font-bold tracking-tight first-letter:uppercase min-[400px]:max-w-36 sm:max-w-56",
                            pinned && "lg:max-w-44 lg:text-sm lg:font-semibold lg:tracking-normal"
                        )}
                    >
                        {label}
                    </span>
                    <ChevronsUpDown
                        className={cn(
                            "text-muted-foreground",
                            pinned ? "hidden lg:block" : "hidden"
                        )}
                    />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                    {t("title")}
                </DropdownMenuLabel>
                {isLoading ? (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">{t("loading")}</p>
                ) : portals.length === 0 ? (
                    <p className="text-muted-foreground px-2 py-1.5 text-sm">{t("empty")}</p>
                ) : (
                    portals.map((portal) => (
                        <DropdownMenuItem
                            key={portal.portalId}
                            onSelect={() => selectPortal(portal.slug)}
                            className="gap-2.5"
                        >
                            <ClubBadge name={portal.displayName} className="size-7" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">
                                    {portal.displayName}
                                </span>
                                <span className="text-muted-foreground block truncate text-xs">
                                    {portal.slug}
                                </span>
                            </span>
                            {portal.slug === portalSlug && <Check className="text-primary" />}
                        </DropdownMenuItem>
                    ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="gap-2.5">
                    <a href={`/${locale}${ROUTES.NEW_CLUB}`}>
                        <Plus className="text-muted-foreground" />
                        {t("newClub")}
                    </a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
