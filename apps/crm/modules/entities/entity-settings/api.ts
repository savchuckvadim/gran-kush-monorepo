import { ApiClientError, assertOpenApiOk } from "@workspace/api-client/core";
import type {
    SchemaCreateEntityDefinitionBodyDto,
    SchemaCreatePortalMemberFieldDto,
    SchemaCreateStageCategoryDto,
    SchemaMemberFieldDefinitionResponseDto,
    SchemaMemberFormFieldSchemaItemDto,
    SchemaMemberFormSchemaResponseDto,
    SchemaOrderStageCategoryResponseDto,
    SchemaPortalFieldOptionInputDto,
    SchemaStatusItemInputDto,
    SchemaStatusItemResponseDto,
    SchemaStatusSetResponseDto,
    SchemaUpdateMemberFormLayoutDto,
    SchemaUpdatePortalMemberFieldDto,
    SchemaUpdateStageCategoryDto,
    SchemaUpdateStatusItemDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type EntityFieldDefinition = SchemaMemberFieldDefinitionResponseDto;
export type EntityFormSchemaField = SchemaMemberFormFieldSchemaItemDto;
export type EntityStageCategory = SchemaOrderStageCategoryResponseDto;
export type EntityStatusSet = SchemaStatusSetResponseDto;
export type EntityStatusItem = SchemaStatusItemResponseDto;

/** Определение сущности портала (форма ответа `/crm/entities` не типизирована в OpenAPI). */
export interface EntityDefinitionSummary {
    id?: string;
    code?: string;
    name?: string;
    isSystem?: boolean;
    isActive?: boolean;
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
): Promise<SchemaMemberFormSchemaResponseDto | null> {
    try {
        const response = await $api.GET("/crm/settings/entities/{code}/form-schema/{purpose}", {
            params: { path: { code, purpose } },
        });
        return assertOpenApiOk<SchemaMemberFormSchemaResponseDto>(response);
    } catch (error) {
        // Формы для purpose ещё нет — конструктор показывает пустую и создаёт при сохранении
        if (error instanceof ApiClientError && error.status === 404) {
            return null;
        }
        throw error;
    }
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

export async function createEntityStageCategory(
    code: string,
    body: SchemaCreateStageCategoryDto
): Promise<EntityStageCategory> {
    const response = await $api.POST("/crm/settings/entities/{code}/stage-categories", {
        params: { path: { code } },
        body,
    });
    return assertOpenApiOk<EntityStageCategory>(response);
}

export async function updateEntityStageCategory(
    code: string,
    categoryId: string,
    body: SchemaUpdateStageCategoryDto
): Promise<EntityStageCategory> {
    const response = await $api.PATCH(
        "/crm/settings/entities/{code}/stage-categories/{categoryId}",
        {
            params: { path: { code, categoryId } },
            body,
        }
    );
    return assertOpenApiOk<EntityStageCategory>(response);
}

export async function deleteEntityStageCategory(code: string, categoryId: string): Promise<void> {
    const response = await $api.DELETE(
        "/crm/settings/entities/{code}/stage-categories/{categoryId}",
        {
            params: { path: { code, categoryId } },
        }
    );
    await assertOpenApiOk(response);
}

export async function listEntityStatusSets(code: string): Promise<EntityStatusSet[]> {
    const response = await $api.GET("/crm/settings/entities/{code}/status-sets", {
        params: { path: { code } },
    });
    return assertOpenApiOk<EntityStatusSet[]>(response);
}

export async function createEntityStatusSet(
    code: string,
    body: { code: string; items: SchemaStatusItemInputDto[] }
): Promise<EntityStatusSet> {
    const response = await $api.POST("/crm/settings/entities/{code}/status-sets", {
        params: { path: { code } },
        body,
    });
    return assertOpenApiOk<EntityStatusSet>(response);
}

export async function addEntityStatusItem(
    code: string,
    setId: string,
    body: SchemaStatusItemInputDto
): Promise<EntityStatusItem> {
    const response = await $api.POST("/crm/settings/entities/{code}/status-sets/{setId}/items", {
        params: { path: { code, setId } },
        body,
    });
    return assertOpenApiOk<EntityStatusItem>(response);
}

export async function updateEntityStatusItem(
    code: string,
    setId: string,
    itemId: string,
    body: SchemaUpdateStatusItemDto
): Promise<EntityStatusItem> {
    const response = await $api.PATCH(
        "/crm/settings/entities/{code}/status-sets/{setId}/items/{itemId}",
        {
            params: { path: { code, setId, itemId } },
            body,
        }
    );
    return assertOpenApiOk<EntityStatusItem>(response);
}

export async function deleteEntityStatusItem(
    code: string,
    setId: string,
    itemId: string
): Promise<void> {
    const response = await $api.DELETE(
        "/crm/settings/entities/{code}/status-sets/{setId}/items/{itemId}",
        {
            params: { path: { code, setId, itemId } },
        }
    );
    await assertOpenApiOk(response);
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
