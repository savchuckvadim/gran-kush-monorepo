"use client";

import { useTranslations } from "next-intl";

import { Activity, BadgeCheck, DoorOpen, Package, ShoppingBag, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import type { TimelineEvent } from "@/modules/entities/timeline";

import { TimelineRow } from "./timeline-row";
import { useTimelineEventText } from "./use-timeline-event-text";

/** Группа события — первая часть имени (`order.placed` → `order`): по ней значок и цвет. */
const LOOKS: Record<string, { icon: ReactNode; tone: string }> = {
    order: {
        icon: <ShoppingBag aria-hidden="true" />,
        tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    member: { icon: <UserRound aria-hidden="true" />, tone: "bg-primary/15 text-primary" },
    presence: { icon: <DoorOpen aria-hidden="true" />, tone: "bg-success/15 text-success-text" },
    employee: {
        icon: <BadgeCheck aria-hidden="true" />,
        tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    product: {
        icon: <Package aria-hidden="true" />,
        tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
};

const FALLBACK = { icon: <Activity aria-hidden="true" />, tone: "bg-muted text-muted-foreground" };

/** Событие шины в таймлайне: что случилось и кто сделал. */
export function TimelineEventItem({ event, last }: { event: TimelineEvent; last: boolean }) {
    const t = useTranslations("crm.timeline");
    const text = useTimelineEventText();
    const look = LOOKS[event.name.split(".")[0] ?? ""] ?? FALLBACK;
    const actor =
        event.actor.kind === "employee"
            ? event.actor.name
            : event.actor.kind === "member"
              ? t("member")
              : t("system");

    return (
        <TimelineRow icon={look.icon} tone={look.tone} at={event.occurredAt} last={last}>
            <p className="text-sm">{text(event)}</p>
            {actor && <p className="text-xs text-muted-foreground">{actor}</p>}
        </TimelineRow>
    );
}
