import type { MovableOrder, OrderFunnelStage } from "@/modules/entities/order";

/** Move this order to that stage of its funnel. */
export interface StageMoveRequest {
    order: MovableOrder;
    target: OrderFunnelStage;
}
