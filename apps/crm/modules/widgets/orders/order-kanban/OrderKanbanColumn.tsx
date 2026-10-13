"use client";

import { useCallback, useMemo } from "react";

import { KanbanColumn, KanbanColumnHeader, KanbanItem } from "@workspace/ui";

import {
    type OrderFunnelStage,
    type OrdersFilter,
    type OrderStageSummaryItem,
    stageColor,
    useOrderStageColumn,
} from "@/modules/entities/order";
import { useMoneyFormat } from "@/modules/shared";

import { OrderKanbanCard } from "./OrderKanbanCard";
import { OrderKanbanColumnFooter } from "./OrderKanbanColumnFooter";

interface OrderKanbanColumnProps {
    stage: OrderFunnelStage;
    filter: OrdersFilter;
    summary: OrderStageSummaryItem | undefined;
    canMove: boolean;
}

/** One stage: the chevron with the count, the total under it, the cards loaded as you scroll. */
export function OrderKanbanColumn({ stage, filter, summary, canMove }: OrderKanbanColumnProps) {
    const money = useMoneyFormat();
    const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
        useOrderStageColumn(stage.id, filter);
    const orders = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
    const loadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

    return (
        <KanbanColumn
            id={stage.id}
            header={
                <KanbanColumnHeader
                    title={stage.name}
                    color={stageColor(stage)}
                    count={summary?.count}
                    aside={
                        <p className="text-center text-sm font-semibold tabular-nums">
                            {money(summary?.total ?? 0)}
                        </p>
                    }
                />
            }
            footer={
                <OrderKanbanColumnFooter
                    isLoading={isLoading}
                    isError={isError}
                    isEmpty={orders.length === 0}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={loadMore}
                />
            }
        >
            {orders.map((order) => (
                <KanbanItem key={order.id} id={order.id} columnId={stage.id} disabled={!canMove}>
                    <OrderKanbanCard order={order} />
                </KanbanItem>
            ))}
        </KanbanColumn>
    );
}
