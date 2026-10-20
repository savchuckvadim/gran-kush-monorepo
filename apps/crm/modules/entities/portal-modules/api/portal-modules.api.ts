import { assertOpenApiOk, type SchemaPortalModuleDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type PortalModule = SchemaPortalModuleDto;
export type PortalModuleCode = PortalModule["code"];

export async function getPortalModules(): Promise<PortalModule[]> {
    const response = await $api.GET("/crm/portal/modules");
    return assertOpenApiOk<PortalModule[]>(response);
}

export async function setPortalModule(
    code: PortalModuleCode,
    enabled: boolean
): Promise<PortalModule> {
    const response = await $api.PUT("/crm/portal/modules/{code}", {
        params: { path: { code } },
        body: { enabled },
    });
    return assertOpenApiOk<PortalModule>(response);
}
