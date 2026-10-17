"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";

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
import { KanbanColumnFooter } from "@/modules/shared/ui/KanbanColumnFooter";

import type { OrderCardField } from "./card-fields";
import { OrderKanbanCard } from "./OrderKanbanCard";

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
    /** Наибольшая сумма среди колонок: от неё считается длина полоски */
    maxTotal: number;
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
    maxTotal,
}: OrderKanbanColumnProps) {
    const t = useTranslations("crm.orders.kanban");
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
                    share={maxTotal > 0 ? (summary?.total ?? 0) / maxTotal : 0}
                    aside={
                        <p className="text-muted-foreground text-xs font-bold tabular-nums">
                            {money(summary?.total ?? 0)}
                        </p>
                    }
                />
            }
            footer={
                <KanbanColumnFooter
                    isLoading={isLoading}
                    isError={isError}
                    isEmpty={orders.length === 0}
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={loadMore}
                    labels={{
                        empty: t("empty"),
                        loadError: t("loadError"),
                        loadMore: t("loadMore"),
                    }}
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
