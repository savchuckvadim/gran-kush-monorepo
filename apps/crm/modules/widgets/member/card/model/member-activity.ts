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
