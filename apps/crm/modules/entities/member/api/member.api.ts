import {
    assertOpenApiOk,
    SchemaCrmCreateMemberDto,
    SchemaCrmCreateMemberResponseDto,
    SchemaCrmMemberDto,
    SchemaCrmMemberFieldsPatchDto,
    SchemaCrmMemberFullDto,
    SchemaMemberFormSchemaResponseDto,
    SchemaMemberLifecycleStatusItemDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

import { CrmMemberDetails, CrmMemberListFilters, CrmMemberListItem } from "../type/member.type";

export async function getCrmMembers(
    limit: number = 100,
    filters?: CrmMemberListFilters
): Promise<CrmMemberListItem[]> {
    const response = await $api.GET("/crm/members", {
        params: {
            query: {
                limit,
                ...(filters?.statusItemId ? { statusItemId: filters.statusItemId } : {}),
                ...(filters?.filterFieldKey ? { filterFieldKey: filters.filterFieldKey } : {}),
                ...(filters?.filterValue !== undefined && filters.filterValue !== ""
                    ? { filterValue: filters.filterValue }
                    : {}),
            } as Record<string, string | number>,
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch members: ${response.response.status}`);
    }

    const members = response.data as SchemaCrmMemberDto[];
    return members as CrmMemberListItem[];
}

export async function getCrmMemberById(memberId: string): Promise<CrmMemberDetails | null> {
    const response = await $api.GET("/crm/members/{id}", {
        params: {
            path: { id: memberId },
        },
    });
    if (!response.response.ok) {
        if (response.response.status === 404) {
            return null;
        }
        throw new Error(`Failed to fetch member: ${response.response.status}`);
    }

    return response.data as CrmMemberDetails;
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
