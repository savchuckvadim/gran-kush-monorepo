import { assertOpenApiOk, type SchemaScanResolutionDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type ScanResolution = SchemaScanResolutionDto;
export type ScannedMember = NonNullable<ScanResolution["member"]>;
export type ScannedProduct = NonNullable<ScanResolution["product"]>;

/** Что за код прочитал сканер: участник, товар клуба или неизвестный код. Ничего не пишет. */
export async function resolveScan(code: string): Promise<ScanResolution> {
    const response = await $api.POST("/crm/scan/resolve", { body: { code } });
    return assertOpenApiOk<ScanResolution>(response);
}
