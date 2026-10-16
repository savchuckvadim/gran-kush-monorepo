import {
    assertOpenApiOk,
    type SchemaCreateClubDto,
    type SchemaMyPortalDto,
    type SchemaMyPortalsResponseDto,
    type SchemaPortalAppearanceDto,
    type SchemaPortalInfoDto,
    type SchemaRegisterPortalDto,
    type SchemaRegisterPortalResponseDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export async function getPortalInfo(): Promise<SchemaPortalInfoDto> {
    const response = await $api.GET("/crm/portal/info");
    return assertOpenApiOk<SchemaPortalInfoDto>(response);
}

/** Тема клуба по умолчанию (admin); `null` — тема PafPaf. */
export async function updatePortalAppearance(
    defaultSkin: string | null
): Promise<SchemaPortalAppearanceDto> {
    const response = await $api.PATCH("/crm/portal/appearance", { body: { defaultSkin } });
    return assertOpenApiOk<SchemaPortalAppearanceDto>(response);
}

/** A new account and its first club (the product site). Sets the CRM session cookies. */
export async function registerClub(
    body: SchemaRegisterPortalDto
): Promise<SchemaRegisterPortalResponseDto> {
    const response = await $api.POST("/platform/portals/register", { body });
    return assertOpenApiOk<SchemaRegisterPortalResponseDto>(response);
}

/** Клубы, в которых аккаунт — сотрудник: переключатель клубов в шапке. */
export async function getMyPortals(): Promise<SchemaMyPortalDto[]> {
    const response = await $api.GET("/crm/my-portals");
    const { portals } = await assertOpenApiOk<SchemaMyPortalsResponseDto>(response);
    return portals;
}

/** One more club for the signed-in account; the session cookies are issued again. */
export async function createClub(
    body: SchemaCreateClubDto
): Promise<SchemaRegisterPortalResponseDto> {
    const response = await $api.POST("/crm/my-portals", { body });
    return assertOpenApiOk<SchemaRegisterPortalResponseDto>(response);
}
