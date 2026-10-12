import { assertOpenApiOk } from "@workspace/api-client/core";
import type {
    SchemaCreateRegistrationLinkDto,
    SchemaPublicRegistrationLinkInfoDto,
    SchemaRegisterViaLinkDto,
    SchemaRegisterViaLinkResponseDto,
    SchemaRegistrationLinkDto,
    SchemaUpdateRegistrationLinkDto,
} from "@workspace/api-client/core";
import type { FormSchemaField } from "@workspace/dynamic-forms";

import { $api } from "@/modules/shared";

export type RegistrationLink = SchemaRegistrationLinkDto;

export async function listRegistrationLinks(): Promise<RegistrationLink[]> {
    const response = await $api.GET("/crm/settings/registration-links");
    const data = await assertOpenApiOk<{ links: RegistrationLink[] }>(response);
    return data.links;
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

export type PublicRegistrationLinkInfo = {
    portalSlug: string;
    portalDisplayName: string;
    schema: { fields: FormSchemaField[] };
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
    return info as unknown as PublicRegistrationLinkInfo;
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
