import type {
    SchemaCreateRegistrationLinkDto,
    SchemaJoinViaLinkDto,
    SchemaJoinViaLinkResponseDto,
    SchemaPublicRegistrationLinkInfoDto,
    SchemaRegisterViaLinkDto,
    SchemaRegisterViaLinkResponseDto,
    SchemaRegistrationLinkDto,
    SchemaRegistrationLinkListResponseDto,
    SchemaRegistrationLinkPrefillDto,
    SchemaUpdateRegistrationLinkDto,
} from "@workspace/api-client/core";
import { assertOpenApiOk } from "@workspace/api-client/core";
import type { FormSchemaField } from "@workspace/dynamic-forms";

import { $api, API_BASE_URL } from "@/modules/shared";
import { $cabinetApi } from "@/modules/shared/api";

export type RegistrationLink = SchemaRegistrationLinkDto;
export type RegistrationLinkStatus = RegistrationLink["status"];
export type RegistrationLinkKind = RegistrationLink["kind"];
export type RegistrationLinkPage = SchemaRegistrationLinkListResponseDto;
export type RegistrationLinkPrefill = SchemaRegistrationLinkPrefillDto;

export interface RegistrationLinkListParams {
    page?: number;
    limit?: number;
    status?: RegistrationLinkStatus;
}

export async function listRegistrationLinks(
    params: RegistrationLinkListParams = {}
): Promise<RegistrationLinkPage> {
    const response = await $api.GET("/crm/settings/registration-links", {
        params: { query: params },
    });
    return assertOpenApiOk<RegistrationLinkPage>(response);
}

export async function createRegistrationLink(
    body: SchemaCreateRegistrationLinkDto
): Promise<RegistrationLink> {
    const response = await $api.POST("/crm/settings/registration-links", { body });
    return assertOpenApiOk<RegistrationLink>(response);
}

export async function updateRegistrationLink(
    id: string,
    body: SchemaUpdateRegistrationLinkDto
): Promise<RegistrationLink> {
    const response = await $api.PATCH("/crm/settings/registration-links/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<RegistrationLink>(response);
}

export async function revokeRegistrationLink(id: string): Promise<RegistrationLink> {
    const response = await $api.POST("/crm/settings/registration-links/{id}/revoke", {
        params: { path: { id } },
    });
    return assertOpenApiOk<RegistrationLink>(response);
}

export type PublicRegistrationLinkInfo = {
    portalSlug: string;
    portalDisplayName: string;
    schema: { fields: FormSchemaField[] };
    prefill: RegistrationLinkPrefill | null;
};

/** The club and its registration form behind a link; 404 when the link is inactive or spent. */
export async function getPublicRegistrationLink(
    token: string
): Promise<PublicRegistrationLinkInfo> {
    const response = await $api.GET("/public/reg-links/{token}", {
        params: { path: { token } },
    });
    // `schema` is a bare object in the OpenAPI contract (the API declares it as `Object`);
    // its real shape is the dynamic-forms one, the same the CRM "new member" form consumes.
    const info = await assertOpenApiOk<SchemaPublicRegistrationLinkInfoDto>(response);
    return { ...(info as unknown as PublicRegistrationLinkInfo), prefill: info.prefill ?? null };
}

export async function registerViaLink(
    token: string,
    body: SchemaRegisterViaLinkDto
): Promise<SchemaRegisterViaLinkResponseDto> {
    const response = await $api.POST("/public/reg-links/{token}/register", {
        params: { path: { token } },
        body,
    });
    return assertOpenApiOk<SchemaRegisterViaLinkResponseDto>(response);
}

/** Вступление по ссылке под сессией участника: новый аккаунт и пароль не нужны. */
export async function joinViaLinkAsMember(
    token: string,
    body: SchemaJoinViaLinkDto
): Promise<SchemaJoinViaLinkResponseDto> {
    const response = await $cabinetApi.POST("/cabinet/reg-links/{token}/join", {
        params: { path: { token } },
        body,
    });
    return assertOpenApiOk<SchemaJoinViaLinkResponseDto>(response);
}

/** Heartbeat of an open public form; the link list shows how many people are on it now. */
export async function pingRegistrationLink(token: string, viewerId: string): Promise<void> {
    await $api.POST("/public/reg-links/{token}/ping", {
        params: { path: { token } },
        body: { viewerId },
    });
}

/**
 * The viewer left. Sent on `pagehide`, when an ordinary request is cancelled together with the
 * page, so it goes as a keepalive fetch; if it is lost anyway, the viewer expires in 45 seconds.
 */
export function leaveRegistrationLink(token: string, viewerId: string): void {
    void fetch(`${API_BASE_URL}/public/reg-links/${encodeURIComponent(token)}/leave`, {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId }),
    }).catch(() => undefined);
}
