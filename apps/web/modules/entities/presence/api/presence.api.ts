import type {
    SchemaPaginatedResponsePresenceSessionDto,
    SchemaPresenceSessionDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";

export interface PresenceStatusResponse extends SchemaPresenceSessionDto {
    isPresent: boolean;
    currentSession: SchemaPresenceSessionDto | null;
}

export interface PresenceHistoryParams {
    page?: number;
    limit?: number;
}

/**
 * Get current member's presence status
 */
export async function getMyPresenceStatus(): Promise<PresenceStatusResponse> {
    const response = await $api.GET("/lk/presence/status");

    if (!response.response.ok) {
        const error = await response.response.text();
        throw new Error(error || "Failed to get presence status");
    }
    const data = response.data as SchemaPresenceSessionDto;
    return {isPresent: data.isActive, currentSession: data} as PresenceStatusResponse;
}

/**
 * Get current member's presence history
 */
export async function getMyPresenceHistory(
    params: PresenceHistoryParams = {}
): Promise<SchemaPaginatedResponsePresenceSessionDto> {
    const response = await $api.GET("/lk/presence/history", {
        params: {
            query: {
                page: params.page ?? 1 as number,
                limit: params.limit ?? 10 as number,
            },
        },
    });

    if (!response.response.ok) {
        const error = await response.response.text();
        throw new Error(error || "Failed to get presence history");
    }

    return response.data as SchemaPaginatedResponsePresenceSessionDto;
}
