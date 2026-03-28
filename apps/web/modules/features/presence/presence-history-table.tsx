"use client";

import { useTranslations } from "next-intl";

import { Calendar, Clock, LogOut } from "lucide-react";

import type { SchemaPresenceSessionDto } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import { useMyPresenceHistory } from "@/modules/entities/presence";

interface PresenceHistoryTableProps {
    page?: number;
    limit?: number;
}

function formatDuration(minutes: number | null | undefined): string {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}ч ${mins}м`;
    }
    return `${mins}м`;
}

function formatDate(date: string | null | undefined): string {
    if (!date) return "—";
    return new Date(date).toLocaleString();
}

export function PresenceHistoryTable({ page = 1, limit = 10 }: PresenceHistoryTableProps) {
    const t = useTranslations("profile.presence");
    const { data, isLoading, error } = useMyPresenceHistory({ page, limit });

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="text-center text-muted-foreground">{t("loading")}</div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6">
                <div className="text-center text-destructive">
                    {t("error")}: {error.message}
                </div>
            </Card>
        );
    }

    if (!data || data.items.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-muted-foreground">{t("noHistory")}</div>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">{t("columns.date")}</th>
                            <th className="px-4 py-3 text-left font-medium">
                                {t("columns.entryTime")}
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                {t("columns.exitTime")}
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                {t("columns.duration")}
                            </th>
                            <th className="px-4 py-3 text-left font-medium">
                                {t("columns.status")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((session: SchemaPresenceSessionDto) => {
                            const isActive = !session.exitedAt;
                            return (
                                <tr key={session.id} className="border-t">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {formatDate(session.enteredAt).split(",")[0]}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-green-600" />
                                            {formatDate(session.enteredAt).split(",")[1]?.trim() ||
                                                "—"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {session.exitedAt ? (
                                            <div className="flex items-center gap-2">
                                                <LogOut className="h-4 w-4 text-red-600" />
                                                {formatDate(session.exitedAt)
                                                    .split(",")[1]
                                                    ?.trim() || "—"}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {formatDuration(
                                            typeof session.durationMinutes === "number"
                                                ? session.durationMinutes
                                                : undefined
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-md border px-2 py-1 text-xs ${
                                                isActive
                                                    ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                                                    : "border-muted text-muted-foreground"
                                            }`}
                                        >
                                            {isActive ? t("status.active") : t("status.completed")}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {data.totalPages > 1 && (
                <div className="border-t bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                    {t("pagination", {
                        page: data.page,
                        totalPages: data.totalPages,
                        total: data.total,
                    })}
                </div>
            )}
        </Card>
    );
}
