import { assertOpenApiOk, type SchemaUiSettingDto } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

/** Настройка интерфейса: клубная и личная по одному ключу. */
export type UiSetting = SchemaUiSettingDto;

/** Ключи настроек; те же значения, что в `UiSettingKey` на бэкенде. */
export const UI_SETTING_KEYS = {
    orderKanbanCard: "kanban.order.card-fields",
} as const;

export type UiSettingKey = (typeof UI_SETTING_KEYS)[keyof typeof UI_SETTING_KEYS];

export async function getUiSetting(key: UiSettingKey): Promise<UiSetting> {
    const response = await $api.GET("/crm/settings/ui/{key}", { params: { path: { key } } });
    return assertOpenApiOk(response);
}

export interface SaveUiSettingInput {
    key: UiSettingKey;
    /** `null` — сбросить настройку */
    value: string[] | null;
    /** true — настройка всего клуба (manager+); иначе личная */
    forPortal?: boolean;
}

export async function saveUiSetting({
    key,
    value,
    forPortal,
}: SaveUiSettingInput): Promise<UiSetting> {
    const response = await $api.PUT("/crm/settings/ui/{key}", {
        params: { path: { key } },
        body: { value, ...(forPortal ? { forPortal } : {}) },
    });
    return assertOpenApiOk(response);
}
