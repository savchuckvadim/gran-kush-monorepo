"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { linkWidgetProvider } from "../api/account-security.api";
import {
    getSignInProviders,
    requestIdentityEmail,
    verifyWidgetSignIn,
} from "../api/identity-auth.api";

import { securityKey } from "./account-security.hook";

/** Набор способов входа меняется только с деплоем: спрашиваем один раз за сессию страницы. */
export function useSignInProviders() {
    return useQuery({
        queryKey: ["cabinet-sign-in-providers"],
        queryFn: getSignInProviders,
        staleTime: Infinity,
        retry: false,
    });
}

/** id бота Telegram кабинета или `null`, если бот не настроен — тогда кнопки нет. */
export function useTelegramBotId(): number | null {
    const providers = useSignInProviders();
    const botId = providers.data?.find((p) => p.key === "telegram")?.config.botId;
    return typeof botId === "number" ? botId : null;
}

export function useWidgetSignIn() {
    return useMutation({ mutationFn: verifyWidgetSignIn });
}

export function useRequestIdentityEmail() {
    return useMutation({ mutationFn: requestIdentityEmail });
}

export function useLinkWidgetProvider() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: linkWidgetProvider,
        onSuccess: (security) => queryClient.setQueryData(securityKey, security),
    });
}
