"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getPresenceSettings,
    type PresenceSettingsPatch,
    updatePresenceSettings,
} from "../api/presence-settings.api";

const presenceSettingsKey = ["presence-settings"] as const;

/** `enabled: false` — the installation has no door (`presence`), the route answers 404. */
export function usePresenceSettings(enabled = true) {
    return useQuery({ queryKey: presenceSettingsKey, queryFn: getPresenceSettings, enabled });
}

export function useUpdatePresenceSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: PresenceSettingsPatch) => updatePresenceSettings(body),
        onSuccess: (settings) => queryClient.setQueryData(presenceSettingsKey, settings),
    });
}
