import type {
    SchemaCrmCreateOrderDto,
    SchemaOrderDetailDto,
    SchemaOrderListDto,
    SchemaOrderStageCategoryResponseDto,
    SchemaOrderStageDto,
    SchemaOrderStageSummaryDto,
    SchemaPaginatedResponseOrderListDto,
} from "@workspace/api-client/core";

export type OrderListItem = SchemaOrderListDto;
export type OrderDetail = SchemaOrderDetailDto;
export type OrderItem = OrderDetail["items"][number];
export type OrderPage = SchemaPaginatedResponseOrderListDto;

/** An order placed by an employee for a member: own price and gifts per line. */
export type CreateOrderBody = SchemaCrmCreateOrderDto;

/** The stage an order stands in; its name is already in the interface language. */
export type OrderStage = SchemaOrderStageDto;

/** A funnel of the order entity with its stages in order. */
export type OrderFunnel = SchemaOrderStageCategoryResponseDto;
export type OrderFunnelStage = OrderFunnel["stages"][number];

export type OrderStageSummary = SchemaOrderStageSummaryDto;
export type OrderStageSummaryItem = OrderStageSummary["stages"][number];

export type PaymentStatus = OrderListItem["paymentStatus"];
export type StageSemantic = OrderStage["semantic"];

/** Filters shared by the list and the kanban. */
export interface OrdersFilter {
    /** Part of the order number */
    search?: string;
    paymentStatus?: PaymentStatus;
    memberId?: string;
    /** ISO bounds of `orderedAt` */
    startDate?: string;
    endDate?: string;
}

export interface OrdersListParams extends OrdersFilter {
    /** One stage: a kanban column, the list filter */
    stageId?: string;
    page?: number;
    limit?: number;
}

/** What moving needs to know about an order: a list row and a detail both fit. */
export type MovableOrder = Pick<OrderListItem, "id" | "orderNumber" | "total" | "stage">;
