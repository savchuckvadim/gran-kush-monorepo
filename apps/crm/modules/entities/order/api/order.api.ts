import type {
    SchemaOrderDetailDto,
    SchemaPaginatedResponseOrderListDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrderStatus =
    | "pending"
    | "confirmed"
    | "preparing"
    | "ready"
    | "completed"
    | "cancelled";
export type PaymentStatus = "pending" | "paid" | "refunded";

export interface OrdersFilter {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    memberId?: string;
    page?: number;
    limit?: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/**
 * Список заказов (CRM)
 */
export async function getOrders(
    filters?: OrdersFilter
): Promise<SchemaPaginatedResponseOrderListDto> {
    const response = await $api.GET("/crm/orders", {
        params: {
            query: {
                status: filters?.status,
                paymentStatus: filters?.paymentStatus,
                memberId: filters?.memberId,
                page: filters?.page ?? 1,
                limit: filters?.limit ?? 20,
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch orders: ${response.response.status}`);
    }

    return response.data as SchemaPaginatedResponseOrderListDto;
}

/**
 * Детали заказа
 */
export async function getOrderById(id: string): Promise<SchemaOrderDetailDto> {
    const response = await $api.GET("/crm/orders/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch order: ${response.response.status}`);
    }

    return response.data as SchemaOrderDetailDto;
}

/**
 * Обновить статус заказа
 */
export async function updateOrderStatus(
    id: string,
    data: { status: OrderStatus }
): Promise<SchemaOrderDetailDto> {
    const response = await $api.PATCH("/crm/orders/{id}/status", {
        params: { path: { id } },
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to update order status: ${response.response.status}`);
    }

    return response.data as SchemaOrderDetailDto;
}

/**
 * Обновить статус оплаты
 */
export async function updatePaymentStatus(
    id: string,
    data: { paymentStatus: PaymentStatus; paymentMethod?: string }
): Promise<SchemaOrderDetailDto> {
    const response = await $api.PATCH("/crm/orders/{id}/payment", {
        params: { path: { id } },
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to update payment: ${response.response.status}`);
    }

    return response.data as SchemaOrderDetailDto;
}
