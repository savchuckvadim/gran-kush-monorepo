"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";

import { KanbanBoard } from "@workspace/ui";

import {
    findOrderInColumns,
    type MovableOrder,
    type OrderFunnel,
    type OrderFunnelStage,
    splitFunnelStages,
    useOrderStageSummary,
} from "@/modules/entities/order";
import { CloseOrderDialog, nextStageOf, useOrderStageMove } from "@/modules/features/order-stage";

import { OrdersFilterBar } from "../order-filters/OrdersFilterBar";
import type { OrderFilters } from "../order-filters/use-order-filters";

import { KanbanCardFieldsMenu } from "./KanbanCardFieldsMenu";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { OrderKanbanColumn } from "./OrderKanbanColumn";
import { useClosingDropZones } from "./use-closing-drop-zones";
import { useOrderCardFields } from "./use-order-card-fields";

interface OrdersKanbanProps {
    funnel: OrderFunnel;
    filters: OrderFilters;
    /** Manager and up; others see the board without drag and drop */
    canMove: boolean;
}

/**
 * Orders by stage: a column per working stage; completed and cancelled appear as drop zones at
 * the bottom while a card is dragged. A card also carries a button to the next stage, which is
 * the move almost every order makes.
 */
export function OrdersKanban({ funnel, filters, canMove }: OrdersKanbanProps) {
    const t = useTranslations("crm.orders.kanban");
    const queryClient = useQueryClient();
    const stages = useMemo(() => splitFunnelStages(funnel.stages), [funnel.stages]);
    const stagesById = useMemo(
        () => new Map(funnel.stages.map((stage) => [stage.id, stage])),
        [funnel.stages]
    );
    const dropZones = useClosingDropZones(stages);
    const cardFields = useOrderCardFields();

    const { data: summary, isFetching } = useOrderStageSummary(funnel.id, filters.filter);
    const totals = useMemo(
        () => new Map((summary?.stages ?? []).map((item) => [item.stageId, item])),
        [summary]
    );
    const workingCount = stages.working.reduce(
        (sum, stage) => sum + (totals.get(stage.id)?.count ?? 0),
        0
    );
    // полоска доли в шапке колонки меряется от самой «тяжёлой» колонки доски
    const maxTotal = stages.working.reduce(
        (max, stage) => Math.max(max, totals.get(stage.id)?.total ?? 0),
        0
    );

    const { requestMove, confirming, confirm, dismiss, isMoving } = useOrderStageMove();

    const handleMove = useCallback(
        (orderId: string, targetId: string) => {
            const order = findOrderInColumns(queryClient, orderId);
            const target = stagesById.get(targetId);
            if (order && target) requestMove({ order, target });
        },
        [queryClient, requestMove, stagesById]
    );

    const moveNext = useCallback(
        (order: MovableOrder, target: OrderFunnelStage) => requestMove({ order, target }),
        [requestMove]
    );

    const renderOverlay = useCallback(
        (orderId: string) => {
            const order = findOrderInColumns(queryClient, orderId);
            return order ? <OrderKanbanCard order={order} fields={cardFields.fields} /> : null;
        },
        [queryClient, cardFields.fields]
    );

    if (stages.working.length === 0) {
        return <p className="py-10 text-center text-sm text-muted-foreground">{t("noFunnel")}</p>;
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <KanbanCardFieldsMenu
                    value={cardFields.fields}
                    onChange={cardFields.setFields}
                    onReset={cardFields.reset}
                    disabled={cardFields.isSaving}
                />
                <OrdersFilterBar
                    filters={filters}
                    total={workingCount}
                    isFetching={isFetching}
                    className="min-w-0 flex-1"
                />
            </div>
            <KanbanBoard
                aria-label={t("label")}
                onMove={handleMove}
                renderOverlay={renderOverlay}
                dropZones={canMove ? dropZones : []}
                className="h-[calc(100dvh-16rem)] min-h-[26rem]"
            >
                {stages.working.map((stage) => (
                    <OrderKanbanColumn
                        key={stage.id}
                        stage={stage}
                        filter={filters.filter}
                        summary={totals.get(stage.id)}
                        canMove={canMove && !isMoving}
                        fields={cardFields.fields}
                        next={nextStageOf(funnel, stage)}
                        onMoveNext={moveNext}
                        maxTotal={maxTotal}
                    />
                ))}
            </KanbanBoard>
            <CloseOrderDialog
                request={confirming}
                onConfirm={confirm}
                onDismiss={dismiss}
                pending={isMoving}
            />
        </div>
    );
}
