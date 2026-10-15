import { assertOpenApiOk } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

import type {
    CreateOrderBody,
    OrderDetail,
    OrderFunnel,
    OrderPage,
    OrdersFilter,
    OrdersListParams,
    OrderStageSummary,
    PaymentStatus,
} from "../model/order.types";

/** Code of the order entity in the funnel settings API. */
const ORDER_ENTITY_CODE = "order";

const DEFAULT_PAGE_SIZE = 20;

const filterQuery = (filter: OrdersFilter) => ({
    search: filter.search?.trim() || undefined,
    paymentStatus: filter.paymentStatus,
    memberId: filter.memberId,
    startDate: filter.startDate,
    endDate: filter.endDate,
});

/** A page of orders; with `stageId` — one kanban column. */
export async function getOrders(params: OrdersListParams = {}): Promise<OrderPage> {
    const response = await $api.GET("/crm/orders", {
        params: {
            query: {
                ...filterQuery(params),
                stageId: params.stageId,
                page: params.page ?? 1,
                limit: params.limit ?? DEFAULT_PAGE_SIZE,
            },
        },
    });
    return assertOpenApiOk(response);
}

export async function getOrderById(id: string): Promise<OrderDetail> {
    const response = await $api.GET("/crm/orders/{id}", { params: { path: { id } } });
    return assertOpenApiOk(response);
}

/** An order for a member; `stageId` is for managers and up, without it — the default stage. */
export async function createOrder(body: CreateOrderBody): Promise<OrderDetail> {
    const response = await $api.POST("/crm/orders", { body });
    return assertOpenApiOk(response);
}

/** Moves an order to a funnel stage (manager and up). */
export async function moveOrderToStage(id: string, stageId: string): Promise<OrderDetail> {
    const response = await $api.PATCH("/crm/orders/{id}/stage", {
        params: { path: { id } },
        body: { stageId },
    });
    return assertOpenApiOk(response);
}

export async function updatePaymentStatus(
    id: string,
    body: { paymentStatus: PaymentStatus; paymentMethod?: string }
): Promise<OrderDetail> {
    const response = await $api.PATCH("/crm/orders/{id}/payment", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk(response);
}

/** Count and total of orders per stage of a funnel — the kanban column headers. */
export async function getOrderStageSummary(
    funnelId: string,
    filter: OrdersFilter
): Promise<OrderStageSummary> {
    const response = await $api.GET("/crm/orders/stages/summary", {
        params: { query: { categoryId: funnelId, ...filterQuery(filter) } },
    });
    return assertOpenApiOk(response);
}

/** Order funnels with their stages; stage names in the interface language. */
export async function getOrderFunnels(): Promise<OrderFunnel[]> {
    const response = await $api.GET("/crm/settings/entities/{code}/stage-categories", {
        params: { path: { code: ORDER_ENTITY_CODE } },
    });
    return assertOpenApiOk(response);
}
