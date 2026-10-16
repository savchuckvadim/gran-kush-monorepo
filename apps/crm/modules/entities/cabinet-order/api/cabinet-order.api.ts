import {
    assertOpenApiOk,
    IDEMPOTENCY_HEADER,
    type SchemaCabinetOrderDetailDto,
    type SchemaCreateOrderDto,
    type SchemaPaginatedResponseCabinetOrderListDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/* Заказы участника в клубе из адреса (X-Portal-Slug), как и витрина. */

export async function listMyOrders(
    page: number,
    limit = 20
): Promise<SchemaPaginatedResponseCabinetOrderListDto> {
    const response = await $cabinetApi.GET("/cabinet/orders", {
        params: { query: { page, limit, sortBy: "orderedAt", sortOrder: "desc" } },
    });
    return assertOpenApiOk<SchemaPaginatedResponseCabinetOrderListDto>(response);
}

export async function getMyOrder(id: string): Promise<SchemaCabinetOrderDetailDto> {
    const response = await $cabinetApi.GET("/cabinet/orders/{id}", {
        params: { path: { id } },
    });
    return assertOpenApiOk<SchemaCabinetOrderDetailDto>(response);
}

/**
 * Ключ идемпотентности задаёт вызывающий: он живёт столько же, сколько корзина, поэтому
 * повторное нажатие «Оформить» после обрыва связи не создаёт второй заказ.
 */
export async function placeMyOrder(
    body: SchemaCreateOrderDto,
    idempotencyKey: string
): Promise<SchemaCabinetOrderDetailDto> {
    const response = await $cabinetApi.POST("/cabinet/orders", {
        body,
        headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return assertOpenApiOk<SchemaCabinetOrderDetailDto>(response);
}

export async function cancelMyOrder(id: string): Promise<SchemaCabinetOrderDetailDto> {
    const response = await $cabinetApi.PATCH("/cabinet/orders/{id}/cancel", {
        params: { path: { id } },
        body: {},
    });
    return assertOpenApiOk<SchemaCabinetOrderDetailDto>(response);
}
