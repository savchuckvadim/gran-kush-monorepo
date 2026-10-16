import {
    ApiClientError,
    assertOpenApiOk,
    SchemaEmployeeMeResponseDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export async function getEmployeeMe(): Promise<SchemaEmployeeMeResponseDto> {
    const response = await $api.GET("/crm/auth/me");

    if (!response.response.ok) {
        const err = new Error(
            `Failed to fetch current employee: ${response.response.status}`
        ) as Error & { status: number };
        err.status = response.response.status;
        throw err;
    }

    return response.data as SchemaEmployeeMeResponseDto;
}

/**
 * Сессия CRM, если она есть. Нет сессии (401) — `null`, а не ошибка: публичные страницы
 * (приглашение, ссылка клуба) сами решают, что показать гостю.
 */
export async function findEmployeeMe(): Promise<SchemaEmployeeMeResponseDto | null> {
    try {
        const response = await $api.GET("/crm/auth/me");
        if (response.response.status === 401) {
            return null;
        }
        return await assertOpenApiOk<SchemaEmployeeMeResponseDto>(response);
    } catch (error) {
        if (error instanceof ApiClientError && error.status === 401) {
            return null;
        }
        throw error;
    }
}
