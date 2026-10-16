"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    getTelegramConfig,
    linkTelegram,
    requestTelegramEmail,
    signInWithTelegram,
    unlinkTelegram,
} from "../api/telegram-auth.api";

import { securityKey } from "./account-security.hook";

/** Настройка бота меняется только с деплоем: спрашиваем один раз за сессию страницы. */
export function useTelegramConfig() {
    return useQuery({
        queryKey: ["telegram-config"],
        queryFn: getTelegramConfig,
        staleTime: Infinity,
        retry: false,
    });
}

export function useTelegramSignIn() {
    return useMutation({ mutationFn: signInWithTelegram });
}

export function useRequestTelegramEmail() {
    return useMutation({ mutationFn: requestTelegramEmail });
}

export function useLinkTelegram() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: linkTelegram,
        onSuccess: (security) => queryClient.setQueryData(securityKey, security),
    });
}

export function useUnlinkTelegram() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: unlinkTelegram,
        onSuccess: (security) => queryClient.setQueryData(securityKey, security),
    });
}
