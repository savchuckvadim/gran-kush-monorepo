import {
    assertOpenApiOk,
    type SchemaMyPresenceStatusDto,
    type SchemaPaginatedResponsePresenceSessionDto,
    type SchemaQrCodeWithPayloadDto,
} from "@workspace/api-client/core";

import { $cabinetApi } from "@/modules/shared/api";

/*
 * Данные участника внутри одного клуба. Клуб клиент берёт из адреса (`/{язык}/{клуб}/…`) и
 * шлёт заголовком X-Portal-Slug, поэтому функции не принимают slug: страницы клуба и запросы
 * всегда относятся к одному и тому же клубу.
 */

/** Действующий QR клуба; API сам выдаёт его при первом обращении и продлевает просроченный. */
export async function getMyQrCode(): Promise<SchemaQrCodeWithPayloadDto> {
    const response = await $cabinetApi.GET("/cabinet/qr-code");
    return assertOpenApiOk<SchemaQrCodeWithPayloadDto>(response);
}

/** Новый код вместо прежнего: прежний сразу перестаёт приниматься на стойке. */
export async function regenerateMyQrCode(): Promise<SchemaQrCodeWithPayloadDto> {
    const response = await $cabinetApi.POST("/cabinet/qr-code/regenerate");
    return assertOpenApiOk<SchemaQrCodeWithPayloadDto>(response);
}

export async function getMyPresenceStatus(): Promise<SchemaMyPresenceStatusDto> {
    const response = await $cabinetApi.GET("/cabinet/presence/status");
    return assertOpenApiOk<SchemaMyPresenceStatusDto>(response);
}

export async function getMyPresenceHistory(
    limit = 5
): Promise<SchemaPaginatedResponsePresenceSessionDto> {
    const response = await $cabinetApi.GET("/cabinet/presence/history", {
        params: { query: { page: 1, limit } },
    });
    return assertOpenApiOk<SchemaPaginatedResponsePresenceSessionDto>(response);
}
