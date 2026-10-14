"use client";

import { useMemo } from "react";

import type { CrmMemberDetails } from "@/modules/entities/member";
import {
    pickFunnel,
    useOrderFunnels,
    useOrders,
    useOrderStageSummary,
} from "@/modules/entities/order";
import { usePresenceSessions } from "@/modules/entities/presence";

import type { MemberCardData } from "../model/member-card.types";
import { type MemberStats, memberStats } from "../model/member-stats";

/** The feed and the tabs show this many latest visits and orders. */
const RECENT_LIMIT = 50;

/** Visits, orders and spending of a member: the figures and the feed of the card. */
export function useMemberCardData(member: CrmMemberDetails): {
    data: MemberCardData;
    stats: MemberStats;
    isLoading: boolean;
} {
    const visits = usePresenceSessions({ memberId: member.id, limit: RECENT_LIMIT });
    const orders = useOrders({ memberId: member.id, limit: RECENT_LIMIT });
    const funnels = useOrderFunnels();
    const funnel = pickFunnel(funnels.data ?? []);
    const summary = useOrderStageSummary(funnel?.id, { memberId: member.id });

    return useMemo(() => {
        const data: MemberCardData = {
            member,
            visits: visits.data?.items ?? [],
            visitsTotal: visits.data?.total ?? 0,
            orders: orders.data?.items ?? [],
            ordersTotal: orders.data?.total ?? 0,
        };
        return {
            data,
            stats: memberStats({ ...data, funnel, summary: summary.data }),
            isLoading: visits.isLoading || orders.isLoading,
        };
    }, [
        member,
        visits.data,
        visits.isLoading,
        orders.data,
        orders.isLoading,
        funnel,
        summary.data,
    ]);
}
