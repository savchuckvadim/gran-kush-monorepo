import type { OrderFunnel, OrderFunnelStage, OrderStage, StageSemantic } from "./order.types";

type StageKind = Pick<OrderStage, "semantic" | "isTerminalSuccess" | "isTerminalFailure">;

export const isFailureStage = (stage: StageKind): boolean =>
    stage.semantic === "FAILURE" || stage.isTerminalFailure;

export const isSuccessStage = (stage: StageKind): boolean =>
    stage.semantic === "SUCCESS" || stage.isTerminalSuccess;

/** A closed order (completed or cancelled) does not move any more; the API refuses it too. */
export const isClosedStage = (stage: StageKind): boolean =>
    isFailureStage(stage) || isSuccessStage(stage);

/** For stages saved without a colour: grey for new, blue in work, green and red to close. */
const FALLBACK_COLOR: Readonly<Record<StageSemantic, string>> = {
    NEW: "#64748b",
    IN_PROGRESS: "#2563eb",
    SUCCESS: "#16a34a",
    FAILURE: "#dc2626",
};

export const stageColor = (
    stage: Pick<OrderStage, "semantic"> & { color?: string | null }
): string => stage.color || FALLBACK_COLOR[stage.semantic];

export interface FunnelStages {
    /** Columns of the kanban, chevrons of the stage bar */
    working: OrderFunnelStage[];
    success: OrderFunnelStage[];
    failure: OrderFunnelStage[];
}

export function splitFunnelStages(stages: readonly OrderFunnelStage[]): FunnelStages {
    const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
    return {
        working: sorted.filter((stage) => !isClosedStage(stage)),
        success: sorted.filter(isSuccessStage),
        failure: sorted.filter((stage) => isFailureStage(stage) && !isSuccessStage(stage)),
    };
}

/** The funnel chosen in the address, else the default one. */
export const pickFunnel = (
    funnels: readonly OrderFunnel[],
    funnelId?: string | null
): OrderFunnel | undefined =>
    funnels.find((funnel) => funnel.id === funnelId) ??
    funnels.find((funnel) => funnel.isDefault) ??
    funnels[0];

/** The funnel an order belongs to: its stage's, or the default one for an order without a stage. */
export const funnelOfOrder = (
    funnels: readonly OrderFunnel[],
    stage: OrderStage | null
): OrderFunnel | undefined => pickFunnel(funnels, stage?.stageCategoryId);

/** A funnel stage in the shape of an order's stage — for the optimistic move. */
export const toOrderStage = (stage: OrderFunnelStage): OrderStage => ({
    id: stage.id,
    stageCategoryId: stage.stageCategoryId,
    name: stage.name,
    color: stage.color ?? null,
    semantic: stage.semantic,
    sortOrder: stage.sortOrder,
    isTerminalSuccess: stage.isTerminalSuccess,
    isTerminalFailure: stage.isTerminalFailure,
});
