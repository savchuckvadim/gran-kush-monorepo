"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getPresenceSettings,
    type PresenceSettingsPatch,
    updatePresenceSettings,
} from "../api/presence-settings.api";

const presenceSettingsKey = ["presence-settings"] as const;

export function usePresenceSettings() {
    return useQuery({ queryKey: presenceSettingsKey, queryFn: getPresenceSettings });
}

export function useUpdatePresenceSettings() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: PresenceSettingsPatch) => updatePresenceSettings(body),
        onSuccess: (settings) => queryClient.setQueryData(presenceSettingsKey, settings),
    });
}
