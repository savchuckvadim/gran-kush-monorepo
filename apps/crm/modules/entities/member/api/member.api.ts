import {
    SchemaCrmMemberDto,
    SchemaCrmMemberFieldsPatchDto,
    SchemaCrmMemberFullDto,
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

// export async function fetchCrmMemberStatusItems(): Promise<
//     SchemaMemberLifecycleStatusItemDto[]
// > {
//     const response = await $api.GET("/crm/settings/entities/member/status-items");
//     const result = response.data
//     if (!result) {
//         throw new Error("Failed to fetch member status items");
//     }
//     return result;
// }

// export async function fetchCrmMemberFilterFields(): Promise<MemberFormSchemaField[]> {
//     const response = await $api.GET("/crm/settings/entities/member/filter-fields");
//     if (!response.response.ok) {
//         throw new Error(`Failed to load filter fields: ${response.response.status}`);
//     }
//     return (response.data ?? []) as MemberFormSchemaField[];
// }

export async function updateCrmMember(
    memberId: string,
    payload: SchemaCrmMemberFieldsPatchDto
): Promise<CrmMemberDetails> {
    // return crmRequest<CrmMemberDetails>(`/crm/members/${memberId}`, {
    //     method: "PATCH",
    //     body: JSON.stringify(payload),
    // });
    const member = $api.PATCH("/crm/members/{id}", {
        params: { path: { id: memberId } },
        body: payload,
    });
    return (await member).data as CrmMemberDetails;
}
