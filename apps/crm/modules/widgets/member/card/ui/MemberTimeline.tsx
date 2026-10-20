"use client";

import { useMemo } from "react";

import { EntityTimeline, type TimelineExtraItem } from "@/modules/widgets/entity-timeline";

import { buildMemberActivity } from "../model/member-activity";
import type { MemberCardData } from "../model/member-card.types";

import { MemberActivityItem } from "./MemberActivityItem";

/** Эти события карточка уже показывает записями (визиты, заказы, вступление) — без дублей. */
const RECORDED_EVENTS = ["presence.entered", "presence.left", "order.placed", "member.joined"];

/**
 * История участника: комментарии команды и события шины плюс визиты и заказы из записей —
 * они старше событий и остаются в истории. Колонка во всю высоту, список прокручивается внутри.
 */
export function MemberTimeline({ data }: { data: MemberCardData }) {
    const extra = useMemo<TimelineExtraItem[]>(
        () =>
            buildMemberActivity(data).map((item) => ({
                key: item.key,
                at: item.at,
                render: (last) => <MemberActivityItem item={item} last={last} />,
            })),
        [data]
    );

    return (
        <EntityTimeline
            subject={{ kind: "member", id: data.member.id }}
            hiddenEvents={RECORDED_EVENTS}
            extra={extra}
            className="lg:sticky lg:top-4 lg:h-[calc(100dvh-8rem)]"
        />
    );
}
