import {
    assertOpenApiOk,
    type SchemaPresenceSettingsDto,
    type SchemaUpdatePresenceSettingsDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

/** Правила присутствия клуба: часовой пояс, ежедневный авто-выход, потолок длительности визита. */
export type PresenceSettings = SchemaPresenceSettingsDto;

export type PresenceSettingsPatch = SchemaUpdatePresenceSettingsDto;

export async function getPresenceSettings(): Promise<PresenceSettings> {
    const response = await $api.GET("/crm/settings/presence");
    return assertOpenApiOk<PresenceSettings>(response);
}

/** Меняются только названные поля; `maxSessionHours: null` снимает потолок. */
export async function updatePresenceSettings(
    body: PresenceSettingsPatch
): Promise<PresenceSettings> {
    const response = await $api.PATCH("/crm/settings/presence", { body });
    return assertOpenApiOk<PresenceSettings>(response);
}
