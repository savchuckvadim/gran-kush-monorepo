"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { useQuery } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown } from "lucide-react";

import type { SchemaMyPortalDto } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

import { usePortal } from "@/modules/processes";
import { $api } from "@/modules/shared";

function useMyPortals(enabled: boolean) {
    return useQuery({
        queryKey: ["crm-my-portals"],
        enabled,
        queryFn: () => $api.GET("/crm/my-portals"),
        select: (response) => (response.data?.portals ?? []) as SchemaMyPortalDto[],
    });
}

export function PortalSwitcher() {
    const router = useRouter();
    const locale = useLocale();
    const { portalSlug } = usePortal();
    const [isOpen, setIsOpen] = useState(false);
    const { data: portals = [], isLoading } = useMyPortals(isOpen);

    const activePortal = portals.find((portal) => portal.slug === portalSlug);
    const label = activePortal?.displayName ?? portalSlug ?? "Портал";

    function selectPortal(slug: string) {
        setIsOpen(false);
        if (slug === portalSlug) return;
        router.push(`/${locale}/${slug}/crm`);
    }

    return (
        <div className="relative">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen((prev) => !prev)}
                className="gap-2"
            >
                <Building2 className="size-4" />
                <span className="max-w-[140px] truncate">{label}</span>
                <ChevronsUpDown className="size-3 opacity-60" />
            </Button>

            {isOpen ? (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 z-50 mt-1 w-64 rounded-md border bg-background p-1 shadow-md">
                        {isLoading ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">Загрузка…</p>
                        ) : portals.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                Нет доступных порталов
                            </p>
                        ) : (
                            portals.map((portal) => (
                                <button
                                    key={portal.portalId}
                                    type="button"
                                    onClick={() => selectPortal(portal.slug)}
                                    className="flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm hover:bg-muted"
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">
                                            {portal.displayName}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {portal.slug} · {portal.role}
                                        </span>
                                    </span>
                                    {portal.slug === portalSlug ? (
                                        <Check className="size-4 shrink-0 text-primary" />
                                    ) : null}
                                </button>
                            ))
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
}
