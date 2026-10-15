"use client";

import { useCallback, useMemo } from "react";

import { KanbanColumn, KanbanColumnHeader, KanbanItem } from "@workspace/ui";

import {
    type MovableOrder,
    type OrderFunnelStage,
    type OrdersFilter,
    type OrderStageSummaryItem,
    stageColor,
    useOrderStageColumn,
} from "@/modules/entities/order";
import { useMoneyFormat } from "@/modules/shared";

import type { OrderCardField } from "./card-fields";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { OrderKanbanColumnFooter } from "./OrderKanbanColumnFooter";

interface OrderKanbanColumnProps {
    stage: OrderFunnelStage;
    filter: OrdersFilter;
    summary: OrderStageSummaryItem | undefined;
    canMove: boolean;
    /** Поля карточки из шестерёнки над доской */
    fields: readonly OrderCardField[];
    /** Куда ведёт кнопка «дальше» с карточек этой колонки */
    next?: OrderFunnelStage;
    onMoveNext: (order: MovableOrder, target: OrderFunnelStage) => void;
}

/** One stage: a thin chevron with the count, the total under it, the cards loaded as you scroll. */
export function OrderKanbanColumn({
    stage,
    filter,
    summary,
    canMove,
    fields,
    next,
    onMoveNext,
}: OrderKanbanColumnProps) {
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
                        <p className="px-1 text-sm font-bold tabular-nums">
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
                    <OrderKanbanCard
                        order={order}
                        fields={fields}
                        next={canMove ? next : undefined}
                        onMoveNext={onMoveNext}
                    />
                </KanbanItem>
            ))}
        </KanbanColumn>
    );
}
