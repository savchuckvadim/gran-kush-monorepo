import { SchemaEmployeeMeResponseDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export async function getEmployeeMe(): Promise<SchemaEmployeeMeResponseDto> {
    const response = await $api.GET("/crm/auth/me");

    if (!response.response.ok) {
        const err = new Error(
            `Failed to fetch current employee: ${response.response.status}`,
        ) as Error & { status: number };
        err.status = response.response.status;
        throw err;
    }

    return response.data as SchemaEmployeeMeResponseDto;
}
