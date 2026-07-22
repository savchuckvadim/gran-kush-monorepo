import { assertOpenApiOk } from "@workspace/api-client/core";
import type {
    SchemaCreateRegistrationLinkDto,
    SchemaRegistrationLinkDto,
    SchemaUpdateRegistrationLinkDto,
} from "@workspace/api-client/core";

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
