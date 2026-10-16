"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getAccountSecurity,
    setAccountPassword,
    signOutEverywhere,
    unlinkGoogle,
} from "../api/account-security.api";

import { cabinetKeys } from "./cabinet-account.hook";

const securityKey = [...cabinetKeys.me, "security"] as const;

export function useAccountSecurity() {
    return useQuery({ queryKey: securityKey, queryFn: getAccountSecurity, retry: false });
}

export function useSetAccountPassword() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setAccountPassword,
        onSuccess: (security) => queryClient.setQueryData(securityKey, security),
    });
}

export function useUnlinkGoogle() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: unlinkGoogle,
        onSuccess: (security) => queryClient.setQueryData(securityKey, security),
    });
}

/** Кэш кабинета принадлежит вышедшему аккаунту — его сбрасывает тот, кто уводит на вход. */
export function useSignOutEverywhere() {
    return useMutation({ mutationFn: signOutEverywhere });
}
