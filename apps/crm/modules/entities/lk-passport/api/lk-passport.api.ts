import { assertOpenApiOk, type SchemaAccountDocumentDto } from "@workspace/api-client/core";

import { $lkApi, API_BASE_URL } from "@/modules/shared/api";

export type DocumentSide = "single" | "front" | "back";

/** Предпросмотр своих файлов отдаёт API; куки сессии идут с запросом `<img>` на тот же сайт. */
export const documentPreviewUrl = (documentId: string): string =>
    `${API_BASE_URL}/lk/account/documents/${documentId}/preview`;
export const signaturePreviewUrl = (): string => `${API_BASE_URL}/lk/account/signature/preview`;

/** Загрузка в аккаунт клубам ничего не открывает: показ — отдельное решение владельца. */
export async function uploadDocument(input: {
    type: string;
    side: DocumentSide;
    number?: string;
    /** Файл как data URL (base64). */
    file: string;
}): Promise<SchemaAccountDocumentDto> {
    const response = await $lkApi.POST("/lk/account/documents", { body: input });
    return assertOpenApiOk<SchemaAccountDocumentDto>(response);
}

export async function deleteDocument(documentId: string): Promise<void> {
    const response = await $lkApi.DELETE("/lk/account/documents/{id}", {
        params: { path: { id: documentId } },
    });
    await assertOpenApiOk(response);
}

/** Показать документ клубу; прежняя версия у этого клуба снимается сама. */
export async function shareDocument(documentId: string, memberId: string): Promise<void> {
    const response = await $lkApi.POST("/lk/account/documents/{id}/share", {
        params: { path: { id: documentId } },
        body: { memberId },
    });
    await assertOpenApiOk(response);
}

export async function revokeDocument(documentId: string, memberId: string): Promise<void> {
    const response = await $lkApi.DELETE("/lk/account/documents/{id}/share/{memberId}", {
        params: { path: { id: documentId, memberId } },
    });
    await assertOpenApiOk(response);
}

export async function putSignature(file: string): Promise<void> {
    const response = await $lkApi.PUT("/lk/account/signature", { body: { file } });
    await assertOpenApiOk(response);
}

/** Удаление подписи снимает её показ всем клубам. */
export async function deleteSignature(): Promise<void> {
    const response = await $lkApi.DELETE("/lk/account/signature");
    await assertOpenApiOk(response);
}

export async function shareSignature(memberId: string): Promise<void> {
    const response = await $lkApi.POST("/lk/account/signature/share", { body: { memberId } });
    await assertOpenApiOk(response);
}

export async function revokeSignature(memberId: string): Promise<void> {
    const response = await $lkApi.DELETE("/lk/account/signature/share/{memberId}", {
        params: { path: { memberId } },
    });
    await assertOpenApiOk(response);
}
