import type { SchemaMemberMeResponseDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared/api";

/**
 * Get current member information
 */
export async function getMyMemberInfo(): Promise<SchemaMemberMeResponseDto> {
    const response = await $api.GET("/lk/auth/me");

    if (!response.response.ok) {
        // Тело уже прочитано openapi-fetch: повторный text() кидал TypeError,
        // ошибка теряла status и редирект на логин по 401 не срабатывал
        const err = new Error("Failed to get member info") as Error & { status?: number };
        err.status = response.response.status;
        throw err;
    }

    return response.data as SchemaMemberMeResponseDto;
}
