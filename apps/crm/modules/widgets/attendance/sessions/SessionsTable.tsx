"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";

import type { SchemaPresenceSessionDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { usePresenceSessions } from "@/modules/entities/presence";

function SessionRow({ session }: { session: SchemaPresenceSessionDto }) {
    const t = useTranslations("crm.attendance.sessions");

    const memberName = session.member
        ? `${session.member.name} ${session.member.surname ?? ""}`.trim()
        : "—";

    const enteredAt = new Date(session.enteredAt);
    const exitedAt = session.exitedAt ? new Date(session.exitedAt) : null;
    const isActive = session.isActive;

    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2 font-medium">{memberName}</td>
            <td className="px-3 py-2">{enteredAt.toLocaleDateString()}</td>
            <td className="px-3 py-2">{enteredAt.toLocaleTimeString()}</td>
            <td className="px-3 py-2">{exitedAt ? exitedAt.toLocaleTimeString() : "—"}</td>
            <td className="px-3 py-2">
                {session.durationMinutes != null && session.durationMinutes > 0
                    ? `${session.durationMinutes} ${t("min")}`
                    : "—"}
            </td>
            <td className="px-3 py-2">
                <span className="text-xs text-muted-foreground">{session.entryMethod}</span>
            </td>
            <td className="px-3 py-2">
                {isActive ? (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700">
                        {t("statusActive")}
                    </span>
                ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {t("statusClosed")}
                    </span>
                )}
            </td>
        </tr>
    );
}

export function SessionsTable() {
    const t = useTranslations("crm.attendance.sessions");
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = usePresenceSessions({ page, limit: 20 });

    const sessions = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    return (
        <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-medium">{t("title")}</h2>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            )}

            {error && <p className="py-4 text-sm text-destructive">{t("error")}</p>}

            {!isLoading && !error && sessions.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}

            {sessions.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">{t("colMember")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colDate")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colEntry")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colExit")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colDuration")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colMethod")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session) => (
                                    <SessionRow key={session.id} session={session} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Пагинация */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {t("page")} {page} / {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
