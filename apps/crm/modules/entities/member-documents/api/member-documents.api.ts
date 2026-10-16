import {
    SchemaCrmMemberAccountDocumentDto,
    SchemaCrmMemberFullDto,
} from "@workspace/api-client/core";

import type { CrmMemberDetails } from "@/modules/entities/member";
import { $api, API_BASE_URL, isApiErrorWithStatus } from "@/modules/shared";

/** Документ аккаунта (паспорт/ID) — совпадает с OpenAPI `CrmMemberAccountDocumentDto`. */
export type IdentityDocument = SchemaCrmMemberAccountDocumentDto;

export interface Signature {
    id: string;
    createdAt: string;
}

/** 404 — файла ещё нет: в формах загрузки показываем плейсхолдер, не ошибку. */
export async function getIdentityDocumentPreview(
    memberId: string,
    documentId: string
): Promise<Blob | null> {
    try {
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
            throw new Error(
                `Failed to fetch identity document preview: ${response.response.status}`
            );
        }

        return response.data as Blob;
    } catch (error) {
        if (isApiErrorWithStatus(error, 404)) {
            return null;
        }
        throw error;
    }
}

export async function getSignaturePreview(memberId: string): Promise<Blob | null> {
    try {
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
    } catch (error) {
        if (isApiErrorWithStatus(error, 404)) {
            return null;
        }
        throw error;
    }
}

/** Адреса превью для `<img>`: файл приватный, браузер шлёт куки CRM сам. */
export function getIdentityDocumentPreviewUrl(memberId: string, documentId: string): string {
    return `${API_BASE_URL}/crm/members/${memberId}/documents/${documentId}/preview`;
}

export function getSignaturePreviewUrl(memberId: string): string {
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
