import type {
    SchemaPaginatedResultPresenceSessionDto,
    SchemaPresenceSessionDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";

export interface PresenceStatusResponse {
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

    return response.data as PresenceStatusResponse;
}

/**
 * Get current member's presence history
 */
export async function getMyPresenceHistory(
    params: PresenceHistoryParams = {}
): Promise<SchemaPaginatedResultPresenceSessionDto> {
    const response = await $api.GET("/lk/presence/history", {
        params: {
            query: {
                page: params.page?.toString() ?? "1",
                limit: params.limit?.toString() ?? "10",
            },
        },
    });

    if (!response.response.ok) {
        const error = await response.response.text();
        throw new Error(error || "Failed to get presence history");
    }

    return response.data as SchemaPaginatedResultPresenceSessionDto;
}
