"use client";

import { useTranslations } from "next-intl";

import {
    Activity,
    BadgeCheck,
    Building2,
    DoorOpen,
    Package,
    ShieldCheck,
    ShoppingBag,
    UserRound,
    Wallet,
} from "lucide-react";
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

const MORE_LOOKS: Record<string, { icon: ReactNode; tone: string }> = {
    portal: { icon: <Building2 aria-hidden="true" />, tone: "bg-primary/15 text-primary" },
    finance: {
        icon: <Wallet aria-hidden="true" />,
        tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    role: { icon: <ShieldCheck aria-hidden="true" />, tone: "bg-muted text-foreground" },
};

const FALLBACK = { icon: <Activity aria-hidden="true" />, tone: "bg-muted text-muted-foreground" };

interface TimelineEventItemProps {
    event: TimelineEvent;
    last: boolean;
    /** Под текстом: о ком событие (в ленте клуба) */
    aside?: ReactNode;
}

/** Событие шины в таймлайне: что случилось и кто сделал. */
export function TimelineEventItem({ event, last, aside }: TimelineEventItemProps) {
    const t = useTranslations("crm.timeline");
    const text = useTimelineEventText();
    const group = event.name.split(".")[0] ?? "";
    const look = LOOKS[group] ?? MORE_LOOKS[group] ?? FALLBACK;
    const actor =
        event.actor.kind === "employee"
            ? event.actor.name
            : event.actor.kind === "member"
              ? t("member")
              : t("system");

    return (
        <TimelineRow icon={look.icon} tone={look.tone} at={event.occurredAt} last={last}>
            <p className="text-sm">{text(event)}</p>
            {aside}
            {actor && <p className="text-xs text-muted-foreground">{actor}</p>}
        </TimelineRow>
    );
}
