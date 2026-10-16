import {
    assertOpenApiOk,
    IDEMPOTENCY_HEADER,
    type SchemaCheckInResultDto,
    type SchemaPaginatedResponsePresenceSessionDto,
    type SchemaPresenceSessionDto,
    type SchemaPresenceStatsDto,
    type SchemaQrCheckInDto,
    type SchemaQrPreviewResultDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type QrPreviewResult = SchemaQrPreviewResultDto;

/** Причины отказа сканера; тексты на языке интерфейса — `crm.attendance.scanner.errors.<код>`. */
export type QrScanErrorCode = NonNullable<SchemaQrPreviewResultDto["errorCode"]>;

export type DoorAction = SchemaQrCheckInDto["action"];

export interface PresenceSessionsFilter {
    memberId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface PresenceStatsFilter {
    startDate?: string;
    endDate?: string;
}

/**
 * Предпросмотр QR на стойке — только проверка и участник, без записи: предлагает действие,
 * которое сотрудник потом подтверждает.
 */
export async function previewQrCodeScan(encryptedCode: string): Promise<QrPreviewResult> {
    const response = await $api.POST("/crm/presence/qr-preview", { body: { encryptedCode } });
    return assertOpenApiOk<QrPreviewResult>(response);
}

/**
 * Подтвердить вход или выход из предпросмотра. Ключ идемпотентности живёт столько же, сколько
 * предпросмотр: двойное нажатие получает тот же ответ, а не вторую отметку.
 */
export async function confirmDoorScan(
    body: SchemaQrCheckInDto,
    idempotencyKey: string
): Promise<SchemaCheckInResultDto> {
    const response = await $api.POST("/crm/presence/qr-scan", {
        body,
        headers: { [IDEMPOTENCY_HEADER]: idempotencyKey },
    });
    return assertOpenApiOk<SchemaCheckInResultDto>(response);
}

/** Ручная отметка входа сотрудником. */
export async function manualCheckIn(memberId: string): Promise<SchemaPresenceSessionDto> {
    const response = await $api.POST("/crm/presence/manual/check-in", { body: { memberId } });
    return assertOpenApiOk<SchemaPresenceSessionDto>(response);
}

/** Ручная отметка выхода сотрудником. */
export async function manualCheckOut(memberId: string): Promise<SchemaPresenceSessionDto> {
    const response = await $api.POST("/crm/presence/manual/check-out", { body: { memberId } });
    return assertOpenApiOk<SchemaPresenceSessionDto>(response);
}

export async function getPresenceSessions(
    filters?: PresenceSessionsFilter
): Promise<SchemaPaginatedResponsePresenceSessionDto> {
    const response = await $api.GET("/crm/presence/sessions", {
        params: {
            query: {
                memberId: filters?.memberId,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                page: filters?.page ?? 1,
                limit: filters?.limit ?? 20,
            },
        },
    });
    return assertOpenApiOk<SchemaPaginatedResponsePresenceSessionDto>(response);
}

export async function getPresenceSessionById(id: string): Promise<SchemaPresenceSessionDto> {
    const response = await $api.GET("/crm/presence/sessions/{id}", {
        params: { path: { id } },
    });
    return assertOpenApiOk<SchemaPresenceSessionDto>(response);
}

export async function getCurrentlyPresent(): Promise<SchemaPresenceSessionDto[]> {
    const response = await $api.GET("/crm/presence/currently-present");
    return assertOpenApiOk<SchemaPresenceSessionDto[]>(response);
}

export async function getPresenceStats(
    filters?: PresenceStatsFilter
): Promise<SchemaPresenceStatsDto> {
    const response = await $api.GET("/crm/presence/stats", {
        params: { query: { startDate: filters?.startDate, endDate: filters?.endDate } },
    });
    return assertOpenApiOk<SchemaPresenceStatsDto>(response);
}
