"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { type OrderListItem, useOrders } from "@/modules/entities/order";
import { EntityList } from "@/modules/shared";
import { useOpenEntity } from "@/modules/shared/lib/entity-slider";

import { OrdersFilterBar } from "../order-filters/OrdersFilterBar";
import type { OrderFilters } from "../order-filters/use-order-filters";

import { useOrderTableColumns } from "./use-order-table-columns";

const PAGE_SIZE = 20;

interface OrdersListProps {
    filters: OrderFilters;
}

/** All orders, closed ones too: a table on a computer, cards on a phone. */
export function OrdersList({ filters }: OrdersListProps) {
    const t = useTranslations("crm.orders.list");
    const openEntity = useOpenEntity();
    const columns = useOrderTableColumns();

    const { data, isLoading, isFetching, error } = useOrders({
        ...filters.filter,
        stageId: filters.stageId,
        page: filters.page,
        limit: PAGE_SIZE,
    });

    const openOrder = (order: OrderListItem) => openEntity({ kind: "order", id: order.id });

    return (
        <Card className="p-4">
            <EntityList<OrderListItem>
                items={data?.items ?? []}
                loading={isLoading}
                error={error ? t("error") : undefined}
                emptyState={
                    <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
                }
                getRowKey={(order) => order.id}
                filterSlot={
                    <OrdersFilterBar
                        filters={filters}
                        total={data?.total}
                        isFetching={isFetching}
                    />
                }
                tableColumns={columns}
                defaultViewMode="table"
                visibilityStorageKey="crm-orders-list"
                viewModeStorageKey="crm-orders-list"
                isRowClickable
                onRowClick={openOrder}
                cardTitle={(order) => <span className="font-mono">{order.orderNumber}</span>}
                defaultVisibleCardFieldKeys={["member", "stage", "payment", "total", "orderedAt"]}
                isCardClickable
                onCardClick={openOrder}
                pagination={{
                    page: filters.page,
                    totalPages: data?.totalPages ?? 1,
                    totalCount: data?.total,
                    onPageChange: filters.setPage,
                }}
            />
        </Card>
    );
}
