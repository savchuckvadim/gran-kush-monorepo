import {
    assertOpenApiOk,
    SchemaCrmCreateMemberDto,
    SchemaCrmCreateMemberResponseDto,
    SchemaCrmMemberFieldsPatchDto,
    SchemaCrmMemberFullDto,
    SchemaMemberFormSchemaResponseDto,
    SchemaMemberLifecycleStatusItemDto,
} from "@workspace/api-client/core";

import { $api, isApiErrorWithStatus } from "@/modules/shared";

import { CrmMemberDetails, CrmMemberListPage, CrmMemberListParams } from "../type/member.type";

export async function getCrmMembers(params: CrmMemberListParams): Promise<CrmMemberListPage> {
    const { page, limit, q, statusItemId, conditions } = params;
    const response = await $api.GET("/crm/members", {
        params: {
            query: {
                page,
                limit,
                ...(q?.trim() ? { q: q.trim() } : {}),
                ...(statusItemId ? { statusItemId } : {}),
                ...(conditions?.length ? { filter: JSON.stringify(conditions) } : {}),
            },
        },
    });
    return assertOpenApiOk<CrmMemberListPage>(response);
}

export async function getCrmMemberById(memberId: string): Promise<CrmMemberDetails | null> {
    try {
        const response = await $api.GET("/crm/members/{id}", {
            params: {
                path: { id: memberId },
            },
        });
        if (!response.response.ok) {
            throw new Error(`Failed to fetch member: ${response.response.status}`);
        }

        return response.data as CrmMemberDetails;
    } catch (error) {
        if (isApiErrorWithStatus(error, 404)) {
            return null;
        }
        throw error;
    }
}

export async function updateCrmMember(
    memberId: string,
    payload: SchemaCrmMemberFieldsPatchDto
): Promise<CrmMemberDetails> {
    const member = $api.PATCH("/crm/members/{id}", {
        params: { path: { id: memberId } },
        body: payload,
    });
    return (await member).data as CrmMemberDetails;
}

export async function updateCrmMemberStatus(
    memberId: string,
    statusItemId: string
): Promise<CrmMemberDetails> {
    const member = await $api.PATCH("/crm/members/{id}/status", {
        params: { path: { id: memberId } },
        body: { statusItemId },
    });
    return member.data as CrmMemberDetails;
}

/** Форма «Новый участник» — своя у каждого клуба (purpose crm_create), по ней же API проверяет данные. */
export async function getCrmMemberCreateSchema(): Promise<SchemaMemberFormSchemaResponseDto> {
    const response = await $api.GET("/crm/members/form-schema", {
        params: { query: { purpose: "crm_create" } },
    });
    // Ответ описан в OpenAPI как Object — форма та же, что у настроек сущности
    return (await assertOpenApiOk(response)) as SchemaMemberFormSchemaResponseDto;
}

export async function createCrmMember(
    body: SchemaCrmCreateMemberDto
): Promise<SchemaCrmCreateMemberResponseDto> {
    return assertOpenApiOk(await $api.POST("/crm/members", { body }));
}
