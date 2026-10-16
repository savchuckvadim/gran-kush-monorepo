"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { Card } from "@workspace/ui";

import { useMyMemberships } from "@/modules/entities/membership";
import { useClubDefaultSkin } from "@/modules/shared/lib/skin";
import { ClubBadge } from "@/modules/shared/ui/Brand";

import { ClubTabs } from "./club-tabs";
import { PresenceBadge } from "./presence-badge";

/**
 * Раздел одного клуба в кабинете: шапка клуба, вкладки (клуб, витрина, заказы) и страница.
 * Страницы внутри открываются только участнику с подтверждённым и действующим членством —
 * остальным раздел объясняет, почему клуба нет, и запросов к клубу не делает. Тема клуба
 * действует, пока участник не выбрал свою.
 */
export function CabinetClubLayout({ slug, children }: { slug: string; children: React.ReactNode }) {
    const t = useTranslations("cabinet.club");
    const { data: memberships = [], isLoading } = useMyMemberships();
    const membership = memberships.find((m) => m.slug === slug);
    const confirmed = membership?.consentStatus === "confirmed" && membership.isActive;
    useClubDefaultSkin(confirmed ? membership.defaultSkin : null);

    if (isLoading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    if (!membership || !confirmed) {
        return (
            <Card>
                <div className="space-y-1 px-4">
                    <p className="font-medium">{t("notMemberTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("notMemberText")}</p>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <header className="space-y-4">
                <div className="flex items-center gap-3">
                    <ClubBadge name={membership.displayName} className="size-10" />
                    <div className="min-w-0">
                        <h1 className="truncate text-2xl font-semibold tracking-tight">
                            {membership.displayName}
                        </h1>
                        <PresenceBadge slug={slug} />
                    </div>
                </div>
                <ClubTabs slug={slug} />
            </header>
            {children}
        </div>
    );
}
