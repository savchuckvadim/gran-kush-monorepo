import { SchemaCrmMemberDto, SchemaCrmMemberFullDto, SchemaCrmMemberUpdateDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";


export interface CrmMemberListItem extends SchemaCrmMemberDto {
    id: string;
    userId: string;
    email: string;
    name: string;
    surname: string | null;
    phone: string | null;
    status: string;
    isActive: boolean;
    emailConfirmed: boolean;
    createdAt: string;
}
export interface IdentityDocument {
    id: string;
    type: string;
    side: string;
    storagePath: string;
    createdAt: string;
}
export interface IMemberSignature {
    id: string;
    storagePath: string;
    createdAt: string;
}
export interface CrmMemberDetails extends SchemaCrmMemberFullDto {
    birthday: string | null;
    address: string | null;
    membershipNumber: string | null;
    notes: string | null;
    updatedAt: string;
    identityDocuments: Array<IdentityDocument>;
    signature: IMemberSignature | null;
    mjStatuses: Array<{
        id: string;
        code: string;
        name: string;
    }>;
    documents: Array<{
        id: string;
        type: string;
        name: string;
        number: string | null;
        createdAt: string;
    }>;
}



export async function getCrmMembers(limit: number = 100): Promise<CrmMemberListItem[]> {
    const response = await $api.GET('/crm/members', {
        params: {
            query: {
                limit: limit,
            },
        },
    });
    
    if (!response.response.ok) {
        throw new Error(`Failed to fetch members: ${response.response.status}`);
    }
    
    const members = response.data as SchemaCrmMemberDto[];
    return members as CrmMemberListItem[];
}

export async function getCrmMemberById(memberId: string): Promise<CrmMemberDetails | null> {
    const response = await $api.GET('/crm/members/{id}', {
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
    
    return response.data as SchemaCrmMemberFullDto as CrmMemberDetails;
}

export async function updateCrmMember(
    memberId: string,
    payload: SchemaCrmMemberUpdateDto 
): Promise<CrmMemberDetails> {
    // return crmRequest<CrmMemberDetails>(`/crm/members/${memberId}`, {
    //     method: "PATCH",
    //     body: JSON.stringify(payload),
    // });
    const member = $api.PATCH('/crm/members/{id}', {params: {path: {id: memberId}}, body: payload})
    return (await member).data as CrmMemberDetails;
}


