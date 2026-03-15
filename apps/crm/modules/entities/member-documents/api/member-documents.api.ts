import { $api } from "@/modules/shared";
import { SchemaCrmMemberFullDto, SchemaCrmMemberIdentityDocumentDto, SchemaCrmMemberSignatureDto } from "@workspace/api-client/core";
import { CrmMemberDetails } from "@/modules/entities/member/api/member.api";

export interface IdentityDocument extends SchemaCrmMemberIdentityDocumentDto {
    id: string;
    type: string;
    side: string;
    storagePath: string;
    createdAt: string;
}

export interface Signature extends SchemaCrmMemberSignatureDto {
    id: string;
    storagePath: string;
    createdAt: string;
}

export async function getIdentityDocumentPreview(memberId: string, documentId: string): Promise<Blob> {
    const response = await $api.GET('/crm/members/{id}/identity-documents/{documentId}/preview', {
        params: {
            path: {
                id: memberId,
                documentId: documentId,
            },
        },
    });
    
    if (!response.response.ok) {
        throw new Error(`Failed to fetch identity document preview: ${response.response.status}`);
    }
    
    return await response.response.blob();
}

export async function getSignaturePreview(memberId: string): Promise<Blob> {
    const response = await $api.GET('/crm/members/{id}/signature/preview', {
        params: {
            path: {
                id: memberId,
            },
        },
    });
    
    if (!response.response.ok) {
        throw new Error(`Failed to fetch signature preview: ${response.response.status}`);
    }
    
    return await response.response.blob();
}

// Legacy functions for backward compatibility (return URL strings)
export function getIdentityDocumentPreviewUrl(memberId: string, documentId: string): string {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${API_BASE_URL}/crm/members/${memberId}/identity-documents/${documentId}/preview`;
}

export function getSignaturePreviewUrl(memberId: string): string {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${API_BASE_URL}/crm/members/${memberId}/signature/preview`;
}

export interface UpdateCrmMemberFilesPayload {
    documentType?: string;
    documentFirst?: string;
    documentSecond?: string;
    signature?: string;
}

export async function updateCrmMemberFiles(
    memberId: string,
    payload: UpdateCrmMemberFilesPayload
): Promise<CrmMemberDetails> {
    const member = await $api.PATCH('/crm/members/{id}/files', {
        params: { path: { id: memberId } },
        body: payload as any,
    });
    return (member.data) as SchemaCrmMemberFullDto as CrmMemberDetails;
}
