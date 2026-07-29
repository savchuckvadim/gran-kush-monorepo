import { SchemaPortalInfoDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export async function getPortalInfo(): Promise<SchemaPortalInfoDto> {
    const response = await $api.GET("/crm/portal/info");
    if (!response.response.ok) {
        throw new Error(`Failed to fetch portal info: ${response.response.status}`);
    }
    return response.data as SchemaPortalInfoDto;
}
