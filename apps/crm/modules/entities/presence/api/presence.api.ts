import type {
    SchemaCheckInResultDto,
    SchemaManualCheckInDto,
    SchemaManualCheckOutDto,
    SchemaPaginatedResponsePresenceSessionDto,
    SchemaPresenceSessionDto,
    SchemaPresenceStatsDto,
    SchemaQrCheckInDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

// ─── Local types (до регенерации OpenAPI-схемы) ──────────────────────────────

export interface QrPreviewMember {
    id: string;
    name: string;
    surname?: string | null;
    membershipNumber?: string | null;
    isActive: boolean;
}

export interface QrPreviewResult {
    valid: boolean;
    error?: string;
    member?: QrPreviewMember;
    /** Присутствует ли участник в клубе прямо сейчас */
    isPresent: boolean;
    /** Предлагаемое действие: вход или выход */
    proposedAction: "entry" | "exit";
}

// ─── Query params ────────────────────────────────────────────────────────────

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

// ─── API functions ───────────────────────────────────────────────────────────

/**
 * Сканировать QR-код (вход/выход — toggle)
 */
export async function scanQrCodeForPresence(
    encryptedCode: string
): Promise<SchemaCheckInResultDto> {
    const response = await $api.POST("/crm/presence/qr-scan", {
        body: { encryptedCode } satisfies SchemaQrCheckInDto,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to scan QR code: ${response.response.status}`);
    }

    return response.data as SchemaCheckInResultDto;
}

/**
 * Предпросмотр QR-кода — только валидация и информация, без записи в БД.
 * Возвращает данные участника + предлагаемое действие (вход/выход).
 */
export async function previewQrCodeScan(encryptedCode: string): Promise<QrPreviewResult> {
    const response = await $api.POST("/crm/presence/qr-preview", {
        body: { encryptedCode },
    });

    if (!response.response.ok) {
        throw new Error(`QR preview failed: ${response.response.status}`);
    }

    return response.data as QrPreviewResult;
}

/**
 * Ручной чек-ин участника (сотрудником)
 */
export async function manualCheckIn(memberId: string): Promise<SchemaPresenceSessionDto> {
    const response = await $api.POST("/crm/presence/manual/check-in", {
        body: { memberId } satisfies SchemaManualCheckInDto,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to check in member: ${response.response.status}`);
    }

    return response.data as SchemaPresenceSessionDto;
}

/**
 * Ручной чек-аут участника (сотрудником)
 */
export async function manualCheckOut(memberId: string): Promise<SchemaPresenceSessionDto> {
    const response = await $api.POST("/crm/presence/manual/check-out", {
        body: { memberId } satisfies SchemaManualCheckOutDto,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to check out member: ${response.response.status}`);
    }

    return response.data as SchemaPresenceSessionDto;
}

/**
 * Получить список сессий присутствия (с пагинацией и фильтрами)
 */
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

    if (!response.response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.response.status}`);
    }

    return response.data as SchemaPaginatedResponsePresenceSessionDto;
}

/**
 * Получить сессию по ID
 */
export async function getPresenceSessionById(id: string): Promise<SchemaPresenceSessionDto> {
    const response = await $api.GET("/crm/presence/sessions/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch session: ${response.response.status}`);
    }

    return response.data as SchemaPresenceSessionDto;
}

/**
 * Получить текущих присутствующих участников
 */
export async function getCurrentlyPresent(): Promise<SchemaPresenceSessionDto[]> {
    const response = await $api.GET("/crm/presence/currently-present");

    if (!response.response.ok) {
        throw new Error(`Failed to fetch currently present: ${response.response.status}`);
    }

    return (response.data as SchemaPresenceSessionDto[]) ?? [];
}

/**
 * Получить статистику присутствия
 */
export async function getPresenceStats(
    filters?: PresenceStatsFilter
): Promise<SchemaPresenceStatsDto> {
    const response = await $api.GET("/crm/presence/stats", {
        params: {
            query: {
                startDate: filters?.startDate,
                endDate: filters?.endDate,
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch stats: ${response.response.status}`);
    }

    return response.data as SchemaPresenceStatsDto;
}
