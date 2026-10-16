import {
    assertOpenApiOk,
    type SchemaAccountDocumentsResponseDto,
    type SchemaConfirmMyMembershipDto,
    type SchemaMemberConsentResultDto,
    type SchemaMyMembershipDto,
    type SchemaMyMembershipsResponseDto,
} from "@workspace/api-client/core";

import { $lkApi } from "@/modules/shared/api";

/** Все членства аккаунта, в том числе ждущие подтверждения и закрытые выходом. */
export async function listMyMemberships(): Promise<SchemaMyMembershipDto[]> {
    const response = await $lkApi.GET("/lk/memberships");
    const data = await assertOpenApiOk<SchemaMyMembershipsResponseDto>(response);
    return data.memberships;
}

/** Подтвердить членство под своей сессией; клуб получит только отмеченные документы. */
export async function confirmMembership(
    memberId: string,
    body: SchemaConfirmMyMembershipDto
): Promise<SchemaMemberConsentResultDto> {
    const response = await $lkApi.POST("/lk/memberships/{id}/confirm", {
        params: { path: { id: memberId } },
        body,
    });
    return assertOpenApiOk<SchemaMemberConsentResultDto>(response);
}

export async function declineMembership(memberId: string): Promise<SchemaMemberConsentResultDto> {
    const response = await $lkApi.POST("/lk/memberships/{id}/decline", {
        params: { path: { id: memberId } },
    });
    return assertOpenApiOk<SchemaMemberConsentResultDto>(response);
}

/** Выход из клуба: членство закрывается, показ документов и подписи отзывается. */
export async function leaveMembership(memberId: string): Promise<SchemaMemberConsentResultDto> {
    const response = await $lkApi.POST("/lk/memberships/{id}/leave", {
        params: { path: { id: memberId } },
    });
    return assertOpenApiOk<SchemaMemberConsentResultDto>(response);
}

/** Документы аккаунта: нужны при подтверждении членства, чтобы выбрать, что показать клубу. */
export async function listAccountDocuments(): Promise<SchemaAccountDocumentsResponseDto> {
    const response = await $lkApi.GET("/lk/account/documents");
    return assertOpenApiOk<SchemaAccountDocumentsResponseDto>(response);
}
