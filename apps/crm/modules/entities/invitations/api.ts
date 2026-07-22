import type {
    SchemaAcceptInvitationDto,
    SchemaCreateInvitationDto,
    SchemaInvitationDto,
    SchemaPublicInvitationInfoDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type Invitation = SchemaInvitationDto;
export type PublicInvitationInfo = SchemaPublicInvitationInfoDto;

async function unwrap<T>(response: { data?: unknown; response: Response }, label: string): Promise<T> {
    if (!response.response.ok) {
        throw new Error(`${label}: ${response.response.status}`);
    }
    return response.data as T;
}

export async function listInvitations(): Promise<Invitation[]> {
    const response = await $api.GET("/crm/settings/invitations");
    const data = await unwrap<{ invitations: Invitation[] }>(response, "listInvitations");
    return data.invitations;
}

export async function createInvitation(body: SchemaCreateInvitationDto): Promise<Invitation> {
    const response = await $api.POST("/crm/settings/invitations", { body });
    return unwrap<Invitation>(response, "createInvitation");
}

export async function revokeInvitation(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/settings/invitations/{id}", {
        params: { path: { id } },
    });
    await unwrap<unknown>(response, "revokeInvitation");
}

export async function getPublicInvitation(token: string): Promise<PublicInvitationInfo> {
    const response = await $api.GET("/public/invitations/{token}", {
        params: { path: { token } },
    });
    return unwrap<PublicInvitationInfo>(response, "getPublicInvitation");
}

export async function acceptInvitation(
    token: string,
    body: SchemaAcceptInvitationDto
): Promise<void> {
    const response = await $api.POST("/public/invitations/{token}/accept", {
        params: { path: { token } },
        body,
    });
    await unwrap<unknown>(response, "acceptInvitation");
}
