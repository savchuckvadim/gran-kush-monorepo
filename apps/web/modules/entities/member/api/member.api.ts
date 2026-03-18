import type { SchemaMemberMeResponseDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";




/**
 * Get current member information
 */
export async function getMyMemberInfo(): Promise<SchemaMemberMeResponseDto> {
    const response = await $api.GET("/lk/auth/me");

    if (!response.response.ok) {
        const status = response.response.status;
        const errorText = await response.response.text();

        const err = new Error(errorText || "Failed to get member info") as Error & { status?: number };
        err.status = status;
        throw err;
    }

    return response.data as SchemaMemberMeResponseDto;
}
