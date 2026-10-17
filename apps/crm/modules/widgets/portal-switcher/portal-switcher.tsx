"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronsUpDown, Plus } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { useMyPortals, usePortalInfo } from "@/modules/entities/portal";
import { usePortal } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { ClubBadge } from "@/modules/shared/ui/Brand";
import { ClubMenu } from "@/modules/shared/ui/ClubMenu";
import { useSidebarPinned } from "@/modules/shared/ui/Sidebar";

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

    const selectPortal = (slug: string) => {
        if (slug === portalSlug) return;
        // Многие query-ключи не содержат slug (members, orders, products):
        // без очистки новый клуб секунду показывает данные предыдущего
        queryClient.clear();
        router.push(`/${locale}/${slug}/crm`);
    };

    return (
        <ClubMenu
            open={isOpen}
            onOpenChange={setIsOpen}
            title={t("title")}
            loading={isLoading}
            texts={{ loading: t("loading"), empty: t("empty") }}
            clubs={portals.map((portal) => ({
                id: portal.slug,
                name: portal.displayName,
                hint: portal.slug,
                current: portal.slug === portalSlug,
            }))}
            onSelect={selectPortal}
            actions={[{ label: t("newClub"), icon: Plus, href: `/${locale}${ROUTES.NEW_CLUB}` }]}
            trigger={
                <Button
                    variant="ghost"
                    // shrink: a long club name gives way (truncate) before the buttons on its right
                    // are pushed off a 360px phone
                    className={cn("min-w-0 shrink gap-2 pl-1.5 pr-2 font-semibold", className)}
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
            }
        />
    );
}
