"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getAccountProfile, saveAccountProfile } from "../api/account-profile.api";

import { cabinetKeys } from "./cabinet-account.hook";

const profileKey = [...cabinetKeys.me, "profile"] as const;

/** `enabled: false` — без сессии участника (страница ссылки открыта гостем). */
export function useAccountProfile(options: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: profileKey,
        queryFn: getAccountProfile,
        enabled: options.enabled ?? true,
        retry: false,
    });
}

export function useSaveAccountProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveAccountProfile,
        onSuccess: (profile) => queryClient.setQueryData(profileKey, profile),
    });
}
