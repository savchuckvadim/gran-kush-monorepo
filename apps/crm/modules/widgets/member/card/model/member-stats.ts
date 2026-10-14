import type { OrderFunnel, OrderStageSummary } from "@/modules/entities/order";
import { splitFunnelStages } from "@/modules/entities/order";

import type { MemberVisit } from "./member-card.types";

export interface MemberStats {
    visits: number;
    inClubNow: boolean;
    lastVisitAt: string | null;
    orders: number;
    ordersInProgress: number;
    /** Sum of the orders handed over (success stages) */
    spent: number;
    handedOver: number;
}

interface MemberStatsInput {
    visits: readonly MemberVisit[];
    visitsTotal: number;
    ordersTotal: number;
    funnel: OrderFunnel | undefined;
    summary: OrderStageSummary | undefined;
}

const sumOver = (
    summary: OrderStageSummary | undefined,
    stageIds: ReadonlySet<string>,
    pick: (item: OrderStageSummary["stages"][number]) => number
): number =>
    (summary?.stages ?? [])
        .filter((item) => stageIds.has(item.stageId))
        .reduce((sum, item) => sum + pick(item), 0);

/** The figures of the card. Visits come newest first, as the API lists them. */
export function memberStats({
    visits,
    visitsTotal,
    ordersTotal,
    funnel,
    summary,
}: MemberStatsInput): MemberStats {
    const { working, success } = splitFunnelStages(funnel?.stages ?? []);
    const workingIds = new Set(working.map((stage) => stage.id));
    const successIds = new Set(success.map((stage) => stage.id));

    return {
        visits: visitsTotal,
        inClubNow: visits.some((visit) => visit.isActive),
        lastVisitAt: visits[0]?.enteredAt ?? null,
        orders: ordersTotal,
        ordersInProgress: sumOver(summary, workingIds, (item) => item.count),
        spent: sumOver(summary, successIds, (item) => Number(item.total)),
        handedOver: sumOver(summary, successIds, (item) => item.count),
    };
}
