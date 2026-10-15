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
import { nextStageOf } from "../model/next-stage";

import { CloseOrderDialog } from "./CloseOrderDialog";
import { NextStageButton } from "./NextStageButton";
import { OrderStageFinishStep } from "./OrderStageFinishStep";

interface OrderStageBarProps {
    order: MovableOrder;
    funnel: OrderFunnel;
    /** Manager and up; others see the bar read-only */
    canMove: boolean;
}

/**
 * Stages of the order as a thin chevron ribbon: the current stage is filled with its colour,
 * the ones behind it take a tint of it, the rest stay grey. A click moves the order, "Finish"
 * closes it, and the usual move — to the next stage — has its own button.
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
    const locked = !canMove || isClosed || isMoving;
    const next = useMemo(
        () => (locked ? undefined : nextStageOf(funnel, current)),
        [locked, funnel, current]
    );

    return (
        <>
            {/* на телефоне кнопка уходит под полосу: иначе на стадии остаётся пара сантиметров */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <StageSteps
                    aria-label={t("barLabel")}
                    title={canMove ? undefined : t("readOnly")}
                    className="min-w-0 sm:flex-1"
                >
                    {working.map((stage, index) => {
                        const isCurrent = stage.id === current?.id;
                        return (
                            <StageStep
                                key={stage.id}
                                first={index === 0}
                                color={stageColor(current ?? stage)}
                                filled={index <= reached}
                                current={isCurrent}
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
                {next && (
                    <NextStageButton
                        order={order}
                        next={next}
                        disabled={isMoving}
                        onMove={(moved, target) => requestMove({ order: moved, target })}
                        className="w-full sm:w-auto"
                    />
                )}
            </div>
            <CloseOrderDialog
                request={confirming}
                onConfirm={confirm}
                onDismiss={dismiss}
                pending={isMoving}
            />
        </>
    );
}
