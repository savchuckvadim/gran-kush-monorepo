import type {
    SchemaAcceptInvitationDto,
    SchemaAcceptInvitationResponseDto,
    SchemaCreatedInvitationDto,
    SchemaCreateInvitationDto,
    SchemaInvitationDto,
    SchemaPublicInvitationInfoDto,
} from "@workspace/api-client/core";
import { assertOpenApiOk } from "@workspace/api-client/core";

import { $api, $cabinetApi } from "@/modules/shared";

export type Invitation = SchemaInvitationDto;
/** Токен есть только в ответе на создание: в списке его нет */
export type CreatedInvitation = SchemaCreatedInvitationDto;
export type PublicInvitationInfo = SchemaPublicInvitationInfoDto;
export type InvitationAcceptance = SchemaAcceptInvitationResponseDto;

export async function listInvitations(): Promise<Invitation[]> {
    const response = await $api.GET("/crm/settings/invitations");
    const data = await assertOpenApiOk<{ invitations: Invitation[] }>(response);
    return data.invitations;
}

export async function createInvitation(
    body: SchemaCreateInvitationDto
): Promise<CreatedInvitation> {
    const response = await $api.POST("/crm/settings/invitations", { body });
    return assertOpenApiOk<CreatedInvitation>(response);
}

export async function revokeInvitation(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/settings/invitations/{id}", {
        params: { path: { id } },
    });
    await assertOpenApiOk(response);
}

export async function getPublicInvitation(token: string): Promise<PublicInvitationInfo> {
    const response = await $api.GET("/public/invitations/{token}", {
        params: { path: { token } },
    });
    return assertOpenApiOk<PublicInvitationInfo>(response);
}

/** Публичная форма: новый аккаунт задаёт пароль, существующий доказывает себя своим. */
export async function acceptInvitationWithPassword(
    token: string,
    body: SchemaAcceptInvitationDto
): Promise<InvitationAcceptance> {
    const response = await $api.POST("/public/invitations/{token}/accept", {
        params: { path: { token } },
        body,
    });
    return assertOpenApiOk<InvitationAcceptance>(response);
}

/** Открытая сессия CRM приглашённого адреса: пароль не нужен. */
export async function acceptInvitationWithCrmSession(token: string): Promise<InvitationAcceptance> {
    const response = await $api.POST("/crm/auth/invitations/{token}/accept", {
        params: { path: { token } },
        body: {},
    });
    return assertOpenApiOk<InvitationAcceptance>(response);
}

/** Открытая сессия кабинета приглашённого адреса: участник становится и сотрудником. */
export async function acceptInvitationWithCabinetSession(
    token: string
): Promise<InvitationAcceptance> {
    const response = await $cabinetApi.POST("/cabinet/invitations/{token}/accept", {
        params: { path: { token } },
        body: {},
    });
    return assertOpenApiOk<InvitationAcceptance>(response);
}
