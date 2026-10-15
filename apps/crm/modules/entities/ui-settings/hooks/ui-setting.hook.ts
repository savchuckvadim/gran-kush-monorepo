"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { usePortal } from "@/modules/processes";

import {
    getUiSetting,
    saveUiSetting,
    type SaveUiSettingInput,
    type UiSetting,
    type UiSettingKey,
} from "../api/ui-setting.api";

/** Настройки меняются редко: держим их в клиентском кеше дольше обычного. */
const TEN_MINUTES = 10 * 60_000;

export const uiSettingKeys = {
    all: ["ui-settings"] as const,
    one: (portalSlug: string | null | undefined, key: UiSettingKey) =>
        [...uiSettingKeys.all, portalSlug, key] as const,
};

export function useUiSetting(key: UiSettingKey) {
    const { portalSlug } = usePortal();
    return useQuery({
        queryKey: uiSettingKeys.one(portalSlug, key),
        queryFn: () => getUiSetting(key),
        enabled: Boolean(portalSlug),
        staleTime: TEN_MINUTES,
    });
}

export function useSaveUiSetting(key: UiSettingKey) {
    const { portalSlug } = usePortal();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: Omit<SaveUiSettingInput, "key">) => saveUiSetting({ ...input, key }),
        onSuccess: (setting: UiSetting) =>
            queryClient.setQueryData(uiSettingKeys.one(portalSlug, key), setting),
    });
}
