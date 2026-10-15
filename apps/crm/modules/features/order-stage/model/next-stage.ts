import {
    isClosedStage,
    type OrderFunnel,
    type OrderFunnelStage,
    type OrderStage,
    splitFunnelStages,
} from "@/modules/entities/order";

/**
 * Куда заказ пойдёт «дальше»: следующая рабочая стадия воронки, а с последней рабочей —
 * первая успешная. У закрытого заказа следующей стадии нет.
 */
export function nextStageOf(
    funnel: OrderFunnel | undefined,
    current: Pick<OrderStage, "id" | "semantic" | "isTerminalSuccess" | "isTerminalFailure"> | null
): OrderFunnelStage | undefined {
    if (!funnel || (current && isClosedStage(current))) return undefined;

    const { working, success } = splitFunnelStages(funnel.stages);
    if (!current) return working[0] ?? success[0];

    const index = working.findIndex((stage) => stage.id === current.id);
    if (index === -1) return undefined;
    return working[index + 1] ?? success[0];
}
