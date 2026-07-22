import type {
    SchemaCreateRegistrationLinkDto,
    SchemaRegistrationLinkDto,
    SchemaUpdateRegistrationLinkDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type RegistrationLink = SchemaRegistrationLinkDto;

async function unwrap<T>(response: { data?: unknown; response: Response }, label: string): Promise<T> {
    if (!response.response.ok) {
        throw new Error(`${label}: ${response.response.status}`);
    }
    return response.data as T;
}

export async function listRegistrationLinks(): Promise<RegistrationLink[]> {
    const response = await $api.GET("/crm/settings/registration-links");
    const data = await unwrap<{ links: RegistrationLink[] }>(response, "listRegistrationLinks");
    return data.links;
}

export async function createRegistrationLink(
    body: SchemaCreateRegistrationLinkDto
): Promise<RegistrationLink> {
    const response = await $api.POST("/crm/settings/registration-links", { body });
    return unwrap<RegistrationLink>(response, "createRegistrationLink");
}

export async function updateRegistrationLink(
    id: string,
    body: SchemaUpdateRegistrationLinkDto
): Promise<RegistrationLink> {
    const response = await $api.PATCH("/crm/settings/registration-links/{id}", {
        params: { path: { id } },
        body,
    });
    return unwrap<RegistrationLink>(response, "updateRegistrationLink");
}
