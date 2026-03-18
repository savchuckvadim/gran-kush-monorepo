"use client";

import { useTranslations } from "next-intl";

import { BarChart3, Loader2 } from "lucide-react";

import { Card } from "@workspace/ui";

import { usePresenceStats } from "@/modules/entities/presence";

export function PresenceStatsCard() {
    const t = useTranslations("crm.attendance.stats");
    const { data: stats, isLoading } = usePresenceStats();

    if (isLoading) {
        return (
            <Card className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            </Card>
        );
    }

    if (!stats) return null;

    const avgDuration = stats.avgDurationMinutes ?? null;

    const statItems = [
        { label: t("totalVisits"), value: stats.totalVisits },
        { label: t("avgDuration"), value: avgDuration ? `${avgDuration} ${t("min")}` : "—" },
        { label: t("currentlyPresent"), value: stats.currentlyPresent },
    ];

    return (
        <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-medium">{t("title")}</h2>
            </div>

            <div className="grid grid-cols-3 gap-4">
                {statItems.map((item) => (
                    <div key={item.label} className="rounded-lg border p-3 text-center">
                        <p className="text-2xl font-bold">{item.value ?? 0}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                    </div>
                ))}
            </div>
        </Card>
    );
}
