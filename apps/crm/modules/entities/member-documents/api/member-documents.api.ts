import { SchemaCrmMemberAccountDocumentDto, SchemaCrmMemberFullDto } from "@workspace/api-client/core";

import type { CrmMemberDetails } from "@/modules/entities/member";
import { $api } from "@/modules/shared";

/** Документ аккаунта (паспорт/ID) — совпадает с OpenAPI `CrmMemberAccountDocumentDto`. */
export type IdentityDocument = SchemaCrmMemberAccountDocumentDto;

export interface Signature {
    id: string;
    createdAt: string;
}

export async function getIdentityDocumentPreview(
    memberId: string,
    documentId: string
): Promise<Blob> {
    const response = await $api.GET("/crm/members/{id}/documents/{documentId}/preview", {
        params: {
            path: {
                id: memberId,
                documentId: documentId,
            },
        },
        parseAs: "blob",
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch identity document preview: ${response.response.status}`);
    }

    return response.data as Blob;
}

export async function getSignaturePreview(memberId: string): Promise<Blob> {
    const response = await $api.GET("/crm/members/{id}/signature/preview", {
        params: {
            path: {
                id: memberId,
            },
        },
        parseAs: "blob",
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch signature preview: ${response.response.status}`);
    }

    return response.data as Blob;
}

// Legacy functions for backward compatibility (return URL strings)
export function getIdentityDocumentPreviewUrl(memberId: string, documentId: string): string {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${API_BASE_URL}/crm/members/${memberId}/documents/${documentId}/preview`;
}

export function getSignaturePreviewUrl(memberId: string): string {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    return `${API_BASE_URL}/crm/members/${memberId}/signature/preview`;
}

export interface UpdateCrmMemberFilesPayload {
    documentType?: string;
    documentFirst?: File | Blob;
    documentSecond?: File | Blob;
    signature?: File | Blob;
}

export async function updateCrmMemberFiles(
    memberId: string,
    payload: UpdateCrmMemberFilesPayload
): Promise<CrmMemberDetails> {
    const formData = new FormData();

    if (payload.documentType) formData.append("documentType", payload.documentType);

    const appendIfPresent = (key: string, value: File | Blob | undefined, fallbackName: string) => {
        if (!value) return;
        if (value instanceof File) {
            formData.append(key, value);
            return;
        }
        formData.append(key, value, fallbackName);
    };

    appendIfPresent("documentFirst", payload.documentFirst, "document-first.png");
    appendIfPresent("documentSecond", payload.documentSecond, "document-second.png");
    appendIfPresent("signature", payload.signature, "signature.png");

    const member = await $api.PATCH("/crm/members/{id}/files", {
        params: { path: { id: memberId } },
        body: formData as unknown as Record<string, unknown>,
    });
    return member.data as SchemaCrmMemberFullDto as CrmMemberDetails;
}
