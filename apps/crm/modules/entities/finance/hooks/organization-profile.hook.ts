"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getOrganizationProfile,
    type OrganizationProfile,
    saveOrganizationProfile,
} from "../api/organization-profile.api";
import { financeProfileKeys } from "../model/finance-profile-keys";

/** Профиль организации; `enabled` — только когда модуль финансов включён (иначе API ответит 403). */
export function useOrganizationProfile({ enabled = true }: { enabled?: boolean } = {}) {
    return useQuery({
        queryKey: financeProfileKeys.all,
        queryFn: getOrganizationProfile,
        enabled,
    });
}

export function useSaveOrganizationProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: saveOrganizationProfile,
        onSuccess: (saved: OrganizationProfile) =>
            queryClient.setQueryData(financeProfileKeys.all, saved),
    });
}
