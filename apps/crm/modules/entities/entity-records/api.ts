import { assertOpenApiOk } from "@workspace/api-client/core";
import type {
    SchemaCreateEntityRecordDto,
    SchemaEntityRecordDto,
    SchemaEntityRecordListResponseDto,
    SchemaUpdateEntityRecordDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type EntityRecord = SchemaEntityRecordDto;

export interface EntityRecordListParams {
    limit?: number;
    skip?: number;
    stageId?: string;
    statusItemId?: string;
}

export async function listEntityRecords(
    code: string,
    params?: EntityRecordListParams
): Promise<SchemaEntityRecordListResponseDto> {
    const response = await $api.GET("/crm/entities/{code}/records", {
        params: { path: { code }, query: params ?? {} },
    });
    return assertOpenApiOk<SchemaEntityRecordListResponseDto>(response);
}

export async function getEntityRecord(code: string, id: string): Promise<EntityRecord> {
    const response = await $api.GET("/crm/entities/{code}/records/{id}", {
        params: { path: { code, id } },
    });
    return assertOpenApiOk<EntityRecord>(response);
}

export async function createEntityRecord(
    code: string,
    body: SchemaCreateEntityRecordDto
): Promise<EntityRecord> {
    const response = await $api.POST("/crm/entities/{code}/records", {
        params: { path: { code } },
        body,
    });
    return assertOpenApiOk<EntityRecord>(response);
}

export async function updateEntityRecord(
    code: string,
    id: string,
    body: SchemaUpdateEntityRecordDto
): Promise<EntityRecord> {
    const response = await $api.PATCH("/crm/entities/{code}/records/{id}", {
        params: { path: { code, id } },
        body,
    });
    return assertOpenApiOk<EntityRecord>(response);
}

export async function deleteEntityRecord(code: string, id: string): Promise<void> {
    const response = await $api.DELETE("/crm/entities/{code}/records/{id}", {
        params: { path: { code, id } },
    });
    await assertOpenApiOk(response);
}

export async function setEntityRecordStage(
    code: string,
    id: string,
    stageId: string | null
): Promise<EntityRecord> {
    const response = await $api.PATCH("/crm/entities/{code}/records/{id}/stage", {
        params: { path: { code, id } },
        body: { stageId },
    });
    return assertOpenApiOk<EntityRecord>(response);
}
