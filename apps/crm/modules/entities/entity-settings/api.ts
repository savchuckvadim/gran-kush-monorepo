import { assertOpenApiOk } from "@workspace/api-client/core";
import type {
    SchemaCreateEntityDefinitionBodyDto,
    SchemaCreatePortalMemberFieldDto,
    SchemaMemberFieldDefinitionResponseDto,
    SchemaMemberFormFieldSchemaItemDto,
    SchemaMemberFormSchemaResponseDto,
    SchemaOrderStageCategoryResponseDto,
    SchemaPortalFieldOptionInputDto,
    SchemaUpdateMemberFormLayoutDto,
    SchemaUpdatePortalMemberFieldDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type EntityFieldDefinition = SchemaMemberFieldDefinitionResponseDto;
export type EntityFormSchemaField = SchemaMemberFormFieldSchemaItemDto;
export type EntityStageCategory = SchemaOrderStageCategoryResponseDto;

/** Определение сущности портала (форма ответа `/crm/entities` не типизирована в OpenAPI). */
export interface EntityDefinitionSummary {
    id?: string;
    code?: string;
    name?: string;
    isSystem?: boolean;
    [key: string]: unknown;
}

export type FormPurpose =
    | "public_registration"
    | "crm_create"
    | "crm_detail"
    | "member_cabinet";

export async function listEntityFields(code: string): Promise<EntityFieldDefinition[]> {
    const response = await $api.GET("/crm/settings/entities/{code}/fields", {
        params: { path: { code } },
    });
    return assertOpenApiOk<EntityFieldDefinition[]>(response);
}

export async function createEntityField(
    code: string,
    body: SchemaCreatePortalMemberFieldDto
): Promise<EntityFieldDefinition> {
    const response = await $api.POST("/crm/settings/entities/{code}/fields", {
        params: { path: { code } },
        body,
    });
    return assertOpenApiOk<EntityFieldDefinition>(response);
}

export async function updateEntityField(
    code: string,
    fieldKey: string,
    body: SchemaUpdatePortalMemberFieldDto
): Promise<EntityFieldDefinition> {
    const response = await $api.PATCH("/crm/settings/entities/{code}/fields/{fieldKey}", {
        params: { path: { code, fieldKey } },
        body,
    });
    return assertOpenApiOk<EntityFieldDefinition>(response);
}

export async function deleteEntityField(code: string, fieldKey: string): Promise<void> {
    const response = await $api.DELETE("/crm/settings/entities/{code}/fields/{fieldKey}", {
        params: { path: { code, fieldKey } },
    });
    await assertOpenApiOk(response);
}

export async function addEntityFieldOption(
    code: string,
    fieldKey: string,
    body: SchemaPortalFieldOptionInputDto
): Promise<void> {
    const response = await $api.POST("/crm/settings/entities/{code}/fields/{fieldKey}/options", {
        params: { path: { code, fieldKey } },
        body,
    });
    await assertOpenApiOk(response);
}

export async function updateEntityForm(
    code: string,
    purpose: FormPurpose,
    body: SchemaUpdateMemberFormLayoutDto
): Promise<void> {
    const response = await $api.PATCH("/crm/settings/entities/{code}/forms/{purpose}", {
        params: { path: { code, purpose } },
        body,
    });
    await assertOpenApiOk(response);
}

export async function getEntityFormSchema(
    code: string,
    purpose: FormPurpose
): Promise<SchemaMemberFormSchemaResponseDto> {
    const response = await $api.GET("/crm/settings/entities/{code}/form-schema/{purpose}", {
        params: { path: { code, purpose } },
    });
    return assertOpenApiOk<SchemaMemberFormSchemaResponseDto>(response);
}

export async function getEntityFilterFields(code: string): Promise<EntityFormSchemaField[]> {
    const response = await $api.GET("/crm/settings/entities/{code}/filter-fields", {
        params: { path: { code } },
    });
    return assertOpenApiOk<EntityFormSchemaField[]>(response);
}

export async function getEntityStageCategories(code: string): Promise<EntityStageCategory[]> {
    const response = await $api.GET("/crm/settings/entities/{code}/stage-categories", {
        params: { path: { code } },
    });
    return assertOpenApiOk<EntityStageCategory[]>(response);
}

export async function listEntityDefinitions(): Promise<EntityDefinitionSummary[]> {
    const response = await $api.GET("/crm/entities");
    return assertOpenApiOk<EntityDefinitionSummary[]>(response);
}

export async function createEntityDefinition(
    body: SchemaCreateEntityDefinitionBodyDto
): Promise<EntityDefinitionSummary> {
    const response = await $api.POST("/crm/entities", { body });
    return assertOpenApiOk<EntityDefinitionSummary>(response);
}
