"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";

import { KanbanBoard } from "@workspace/ui";

import {
    findOrderInColumns,
    type OrderFunnel,
    splitFunnelStages,
    useOrderStageSummary,
} from "@/modules/entities/order";
import { CloseOrderDialog, useOrderStageMove } from "@/modules/features/order-stage";

import { OrdersFilterBar } from "../order-filters/OrdersFilterBar";
import type { OrderFilters } from "../order-filters/use-order-filters";

import { OrderKanbanCard } from "./OrderKanbanCard";
import { OrderKanbanColumn } from "./OrderKanbanColumn";
import { useClosingDropZones } from "./use-closing-drop-zones";

interface OrdersKanbanProps {
    funnel: OrderFunnel;
    filters: OrderFilters;
    /** Manager and up; others see the board without drag and drop */
    canMove: boolean;
}

/**
 * Orders by stage, as Bitrix24 deals: a column per working stage; completed and cancelled appear
 * as drop zones at the bottom while a card is dragged.
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

    const { data: summary, isFetching } = useOrderStageSummary(funnel.id, filters.filter);
    const totals = useMemo(
        () => new Map((summary?.stages ?? []).map((item) => [item.stageId, item])),
        [summary]
    );
    const workingCount = stages.working.reduce(
        (sum, stage) => sum + (totals.get(stage.id)?.count ?? 0),
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

    const renderOverlay = useCallback(
        (orderId: string) => {
            const order = findOrderInColumns(queryClient, orderId);
            return order ? <OrderKanbanCard order={order} /> : null;
        },
        [queryClient]
    );

    if (stages.working.length === 0) {
        return <p className="py-10 text-center text-sm text-muted-foreground">{t("noFunnel")}</p>;
    }

    return (
        <div className="space-y-3">
            <OrdersFilterBar filters={filters} total={workingCount} isFetching={isFetching} />
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
