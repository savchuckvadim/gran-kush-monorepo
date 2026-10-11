"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";

import type { SchemaMyPortalDto } from "@workspace/api-client/core";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { usePortalInfo } from "@/modules/entities/portal";
import { usePortal } from "@/modules/processes";
import { $api } from "@/modules/shared";
import { ClubBadge } from "@/modules/shared/ui/Brand";

function useMyPortals(enabled: boolean) {
    return useQuery({
        queryKey: ["crm-my-portals"],
        enabled,
        queryFn: () => $api.GET("/crm/my-portals"),
        select: (response) => (response.data?.portals ?? []) as SchemaMyPortalDto[],
    });
}

/** Текущий клуб и переход в другой клуб сотрудника. */
export function PortalSwitcher({ className }: { className?: string }) {
    const t = useTranslations("crm.shell.club");
    const router = useRouter();
    const locale = useLocale();
    const { portalSlug } = usePortal();
    const [isOpen, setIsOpen] = useState(false);
    const { data: info } = usePortalInfo();
    const { data: portals = [], isLoading } = useMyPortals(isOpen);

    const label = info?.displayName ?? portalSlug ?? t("fallback");

    function selectPortal(slug: string) {
        if (slug === portalSlug) return;
        router.push(`/${locale}/${slug}/crm`);
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className={cn("min-w-0 gap-2 pl-1.5 pr-2 font-semibold", className)}
                >
                    <ClubBadge name={label} className="size-6 text-[0.625rem]" />
                    <span className="max-w-44 truncate">{label}</span>
                    <ChevronsUpDown className="text-muted-foreground" />
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
