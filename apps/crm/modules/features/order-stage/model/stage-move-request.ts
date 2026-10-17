import type { MovableOrder, OrderFunnelStage } from "@/modules/entities/order";

/** Move this order to that stage of its funnel; on the kanban — under the card `afterId`. */
export interface StageMoveRequest {
    order: MovableOrder;
    target: OrderFunnelStage;
    /** `null` — the top of the column; not given (the stage bar) — only the stage counts */
    afterId?: string | null;
}
