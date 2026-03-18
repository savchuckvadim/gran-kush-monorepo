"use client";

import { useTranslations } from "next-intl";

import { Clock, Loader2, LogOut, Users } from "lucide-react";

import type { SchemaPresenceSessionDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { useCurrentlyPresent, useManualCheckOut } from "@/modules/entities/presence";

function PresenceRow({ session }: { session: SchemaPresenceSessionDto }) {
    const t = useTranslations("crm.attendance.present");
    const checkOut = useManualCheckOut();

    const memberName = session.member
        ? `${session.member.name} ${session.member.surname ?? ""}`.trim()
        : t("unknownMember");

    const enteredAt = new Date(session.enteredAt);
    const durationMinutes = session.durationMinutes ?? 0;

    return (
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{memberName}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                        {t("since")} {enteredAt.toLocaleTimeString()}
                    </span>
                    {durationMinutes > 0 && (
                        <span className="rounded bg-muted px-1.5 py-0.5">
                            {durationMinutes} {t("min")}
                        </span>
                    )}
                </div>
            </div>

            <Button
                variant="outline"
                size="sm"
                onClick={() => checkOut.mutate(session.memberId)}
                disabled={checkOut.isPending}
            >
                <LogOut className="mr-1 h-3.5 w-3.5" />
                {t("checkOut")}
            </Button>
        </div>
    );
}

export function CurrentlyPresentList() {
    const t = useTranslations("crm.attendance.present");
    const { data: sessions, isLoading, error } = useCurrentlyPresent();

    return (
        <Card className="p-4">
            <div className="mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-base font-medium">{t("title")}</h2>
                {sessions && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {sessions.length}
                    </span>
                )}
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            )}

            {error && (
                <p className="py-4 text-sm text-destructive">{t("error")}</p>
            )}

            {sessions && sessions.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}

            {sessions && sessions.length > 0 && (
                <div className="space-y-2">
                    {sessions.map((session) => (
                        <PresenceRow key={session.id} session={session} />
                    ))}
                </div>
            )}
        </Card>
    );
}
