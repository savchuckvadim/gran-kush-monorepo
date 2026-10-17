import type {
    SchemaCreateEntityRecordDto,
    SchemaEntityRecordDto,
    SchemaEntityRecordListResponseDto,
    SchemaUpdateEntityRecordDto,
} from "@workspace/api-client/core";
import { assertOpenApiOk } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type EntityRecord = SchemaEntityRecordDto;

/** What narrows a smart-process board or table: the funnel, search and field conditions. */
export interface RecordsFilter {
    stageCategoryId?: string;
    q?: string;
    /** Field conditions as the API's JSON string — stable in a query key */
    filter?: string;
}

export interface EntityRecordListParams extends RecordsFilter {
    limit?: number;
    skip?: number;
    stageId?: string;
    statusItemId?: string;
    /** `stagePosition` — the order of cards in a kanban column; by default the newest first */
    sortBy?: "createdAt" | "stagePosition";
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

/**
 * Moves a record to a stage; `afterId` — the card it goes under in the column (`null` — the
 * top), in the same stage that is a reorder. Without it a new stage puts the card on top.
 */
export async function setEntityRecordStage(
    code: string,
    id: string,
    stageId: string | null,
    afterId?: string | null
): Promise<EntityRecord> {
    const response = await $api.PATCH("/crm/entities/{code}/records/{id}/stage", {
        params: { path: { code, id } },
        body: { stageId, afterId },
    });
    return assertOpenApiOk<EntityRecord>(response);
}
