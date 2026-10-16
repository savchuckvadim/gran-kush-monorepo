import {
    assertOpenApiOk,
    type SchemaClubPolicyDto,
    type SchemaUpdateClubPolicyDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type ClubPolicy = SchemaClubPolicyDto;

export async function getClubPolicy(): Promise<ClubPolicy> {
    const response = await $api.GET("/crm/settings/club-policy");
    return assertOpenApiOk<ClubPolicy>(response);
}

/** Only the named rules change; the rest stay as they were. */
export async function updateClubPolicy(body: SchemaUpdateClubPolicyDto): Promise<ClubPolicy> {
    const response = await $api.PATCH("/crm/settings/club-policy", { body });
    return assertOpenApiOk<ClubPolicy>(response);
}
