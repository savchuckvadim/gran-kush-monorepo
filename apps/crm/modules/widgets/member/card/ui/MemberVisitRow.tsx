"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui";

import { useDateFormat, useTimeFormat } from "@/modules/shared/lib/use-date-format";
import { useDurationFormat } from "@/modules/shared/lib/use-span-format";

import type { MemberVisit } from "../model/member-card.types";

export function MemberVisitRow({ visit }: { visit: MemberVisit }) {
    const t = useTranslations("crm.members.card.visits");
    const date = useDateFormat();
    const time = useTimeFormat();
    const duration = useDurationFormat();

    return (
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
            <span className="w-32 font-medium">{date(visit.enteredAt)}</span>
            <span className="text-muted-foreground tabular-nums">
                {time(visit.enteredAt)}
                {visit.exitedAt ? ` – ${time(visit.exitedAt)}` : ""}
            </span>
            {visit.isActive ? (
                <Badge variant="success">{t("now")}</Badge>
            ) : typeof visit.durationMinutes === "number" ? (
                <span className="text-muted-foreground tabular-nums">
                    {duration(visit.durationMinutes)}
                </span>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">
                {t(`method.${visit.entryMethod}`)}
            </span>
        </li>
    );
}
