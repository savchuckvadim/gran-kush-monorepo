"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { StageStep, StageSteps } from "@workspace/ui";

import {
    isClosedStage,
    type MovableOrder,
    type OrderFunnel,
    splitFunnelStages,
    stageColor,
} from "@/modules/entities/order";

import { useOrderStageMove } from "../hooks/use-order-stage-move";

import { CloseOrderDialog } from "./CloseOrderDialog";
import { OrderStageFinishStep } from "./OrderStageFinishStep";

interface OrderStageBarProps {
    order: MovableOrder;
    funnel: OrderFunnel;
    /** Manager and up; others see the bar read-only */
    canMove: boolean;
}

/**
 * Stages of the order as chevrons (Bitrix24): passed ones and the current one take the current
 * stage's colour, the rest stay grey; a click moves the order, "Finish" closes it.
 */
export function OrderStageBar({ order, funnel, canMove }: OrderStageBarProps) {
    const t = useTranslations("crm.orders.stage");
    const { requestMove, confirming, confirm, dismiss, isMoving } = useOrderStageMove();
    const { working, success, failure } = useMemo(
        () => splitFunnelStages(funnel.stages),
        [funnel.stages]
    );
    const closingStages = useMemo(() => [...success, ...failure], [success, failure]);

    const current = order.stage;
    const isClosed = current !== null && isClosedStage(current);
    const reached = isClosed
        ? working.length
        : working.findIndex((stage) => stage.id === current?.id);
    const fill = current ? stageColor(current) : undefined;
    const locked = !canMove || isClosed || isMoving;

    return (
        <>
            <StageSteps aria-label={t("barLabel")} title={canMove ? undefined : t("readOnly")}>
                {working.map((stage, index) => {
                    const isCurrent = stage.id === current?.id;
                    return (
                        <StageStep
                            key={stage.id}
                            first={index === 0}
                            color={fill ?? stageColor(stage)}
                            filled={index <= reached}
                            disabled={locked || isCurrent}
                            aria-current={isCurrent ? "step" : undefined}
                            title={stage.name}
                            onClick={() => requestMove({ order, target: stage })}
                        >
                            {stage.name}
                        </StageStep>
                    );
                })}
                <OrderStageFinishStep
                    closingStages={closingStages}
                    closedStage={isClosed ? current : null}
                    disabled={locked}
                    first={working.length === 0}
                    onPick={(target) => requestMove({ order, target })}
                />
            </StageSteps>
            <CloseOrderDialog
                request={confirming}
                onConfirm={confirm}
                onDismiss={dismiss}
                pending={isMoving}
            />
        </>
    );
}
