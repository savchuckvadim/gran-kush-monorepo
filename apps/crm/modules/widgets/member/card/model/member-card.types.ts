import type { SchemaPresenceSessionDto } from "@workspace/api-client/core";

import type { CrmMemberDetails } from "@/modules/entities/member";
import type { OrderListItem } from "@/modules/entities/order";

export type MemberVisit = SchemaPresenceSessionDto;

/** Where the card is shown: its own page, or a slider over another page. */
export type MemberCardLayout = "page" | "slider";

export interface MemberCardProps {
    memberId: string;
    layout?: MemberCardLayout;
}

/** What the card knows about a member besides the profile. */
export interface MemberCardData {
    member: CrmMemberDetails;
    visits: readonly MemberVisit[];
    visitsTotal: number;
    orders: readonly OrderListItem[];
    ordersTotal: number;
}
