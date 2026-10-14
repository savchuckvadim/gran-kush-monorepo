import type { CrmMemberDetails } from "@/modules/entities/member";
import type { OrderListItem } from "@/modules/entities/order";

import type { MemberVisit } from "./member-card.types";

/** One line of the member's feed. */
export type MemberActivity =
    | { kind: "joined"; key: string; at: string }
    | { kind: "consent-pending"; key: string; at: string }
    | { kind: "note"; key: string; at: string; text: string }
    | { kind: "order"; key: string; at: string; order: OrderListItem }
    | { kind: "visit"; key: string; at: string; visit: MemberVisit };

export interface MemberActivityDay {
    /** `YYYY-MM-DD` in local time */
    day: string;
    items: MemberActivity[];
}

interface ActivitySources {
    member: CrmMemberDetails;
    visits: readonly MemberVisit[];
    orders: readonly OrderListItem[];
}

/** Everything that happened to the member that the CRM knows of, newest first. */
export function buildMemberActivity({ member, visits, orders }: ActivitySources): MemberActivity[] {
    const items: MemberActivity[] = [
        { kind: "joined", key: `joined:${member.id}`, at: member.createdAt },
        ...visits.map(
            (visit): MemberActivity => ({
                kind: "visit",
                key: `visit:${visit.id}`,
                at: visit.enteredAt,
                visit,
            })
        ),
        ...orders.map(
            (order): MemberActivity => ({
                kind: "order",
                key: `order:${order.id}`,
                at: order.orderedAt,
                order,
            })
        ),
    ];
    if (member.consentStatus === "pending") {
        items.push({ kind: "consent-pending", key: `consent:${member.id}`, at: member.createdAt });
    }
    if (member.notes) {
        items.push({
            kind: "note",
            key: `note:${member.id}`,
            at: member.updatedAt,
            text: member.notes,
        });
    }
    return items.sort((a, b) => b.at.localeCompare(a.at));
}

const dayKey = (iso: string): string => {
    const date = new Date(iso);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
};

/** The feed by day, keeping the order. */
export function groupActivityByDay(items: readonly MemberActivity[]): MemberActivityDay[] {
    const days: MemberActivityDay[] = [];
    for (const item of items) {
        const day = dayKey(item.at);
        const last = days[days.length - 1];
        if (last?.day === day) last.items.push(item);
        else days.push({ day, items: [item] });
    }
    return days;
}

/** «Сегодня», «Вчера» or nothing: the caller then prints the date. */
export function relativeDay(day: string, now = new Date()): "today" | "yesterday" | null {
    if (day === dayKey(now.toISOString())) return "today";
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return day === dayKey(yesterday.toISOString()) ? "yesterday" : null;
}
