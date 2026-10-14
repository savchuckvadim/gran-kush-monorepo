"use client";

import { useTranslations } from "next-intl";

import { DoorOpen, Hourglass, ShoppingBag, Sparkles, StickyNote } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { OrderStageBadge } from "@/modules/entities/order";
import { useTimeFormat } from "@/modules/shared/lib/use-date-format";
import { useMoneyFormat } from "@/modules/shared/lib/use-money-format";
import { useDurationFormat } from "@/modules/shared/lib/use-span-format";
import { EntityLink } from "@/modules/shared/ui/EntityLink";

import type { MemberActivity } from "../model/member-activity";

interface MemberActivityItemProps {
    item: MemberActivity;
    /** The last line of a day: no thread below its icon */
    last: boolean;
}

const TONES: Record<MemberActivity["kind"], string> = {
    joined: "bg-primary/15 text-primary",
    "consent-pending": "bg-warning/15 text-warning-text",
    note: "bg-muted text-muted-foreground",
    order: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    visit: "bg-success/15 text-success-text",
};

const ICONS: Record<MemberActivity["kind"], ReactNode> = {
    joined: <Sparkles aria-hidden="true" />,
    "consent-pending": <Hourglass aria-hidden="true" />,
    note: <StickyNote aria-hidden="true" />,
    order: <ShoppingBag aria-hidden="true" />,
    visit: <DoorOpen aria-hidden="true" />,
};

export function MemberActivityItem({ item, last }: MemberActivityItemProps) {
    const time = useTimeFormat();

    return (
        <li className="relative flex gap-3 pb-3">
            {!last && (
                <span
                    aria-hidden="true"
                    className="absolute top-8 bottom-0 left-4 w-px bg-border"
                />
            )}
            <span
                className={cn(
                    "relative flex size-8 shrink-0 items-center justify-center rounded-full [&_svg]:size-4",
                    TONES[item.kind]
                )}
            >
                {ICONS[item.kind]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1">
                <ActivityBody item={item} />
            </div>
            <time
                dateTime={item.at}
                className="shrink-0 pt-1.5 text-xs text-muted-foreground tabular-nums"
            >
                {time(item.at)}
            </time>
        </li>
    );
}

function ActivityBody({ item }: { item: MemberActivity }) {
    const t = useTranslations("crm.members.card");
    const money = useMoneyFormat();
    const duration = useDurationFormat();
    const time = useTimeFormat();

    switch (item.kind) {
        case "joined":
            return <span className="text-sm font-medium">{t("feed.joined")}</span>;
        case "consent-pending":
            return <span className="text-sm font-medium">{t("feed.consentPending")}</span>;
        case "note":
            return (
                <>
                    <span className="text-sm font-medium">{t("feed.note")}</span>
                    <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
                        {item.text}
                    </p>
                </>
            );
        case "order":
            return (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <EntityLink
                            kind="order"
                            id={item.order.id}
                            className="text-sm font-medium underline-offset-4 hover:underline"
                        >
                            {t("feed.order", { number: item.order.orderNumber })}
                        </EntityLink>
                        <OrderStageBadge stage={item.order.stage} />
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {money(Number(item.order.total))}
                    </span>
                </>
            );
        case "visit": {
            const { visit } = item;
            const closed = !visit.isActive && visit.exitedAt;
            return (
                <>
                    <span className="text-sm font-medium">
                        {closed && typeof visit.durationMinutes === "number"
                            ? t("feed.visitClosed", { duration: duration(visit.durationMinutes) })
                            : visit.isActive
                              ? t("visits.now")
                              : t("feed.visitOpen")}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                        {time(visit.enteredAt)}
                        {visit.exitedAt ? ` – ${time(visit.exitedAt)}` : ""}
                        {" · "}
                        {t(`visits.method.${visit.entryMethod}`)}
                    </span>
                </>
            );
        }
    }
}
