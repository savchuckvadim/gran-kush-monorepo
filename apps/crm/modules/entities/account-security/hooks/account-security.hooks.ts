"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AccountSecurity } from "../model/account-security-client";
import { useAccountSecurityClient } from "../model/account-security-context";

/** Ключи кэша «Вход и безопасность» — свои у каждого приложения: куки и аккаунт сессии у них разные. */
export const accountSecurityKeys = {
    all: (audience: string) => ["account-security", audience] as const,
    security: (audience: string) => ["account-security", audience, "security"] as const,
    sessions: (audience: string) => ["account-security", audience, "sessions"] as const,
    providers: (audience: string) => ["account-security", audience, "providers"] as const,
};

export function useAccountSecurity() {
    const client = useAccountSecurityClient();
    return useQuery({
        queryKey: accountSecurityKeys.security(client.audience),
        queryFn: () => client.getSecurity(),
        retry: false,
    });
}

/** Мутация, ответ которой — новое состояние способов входа: кладём его в кэш как есть. */
const useSecurityMutation = <TInput>(run: (input: TInput) => Promise<AccountSecurity>) => {
    const client = useAccountSecurityClient();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: run,
        onSuccess: (security) =>
            queryClient.setQueryData(accountSecurityKeys.security(client.audience), security),
    });
};

export function useSetAccountPassword() {
    const client = useAccountSecurityClient();
    return useSecurityMutation(client.setPassword);
}

export function useLinkWidgetProvider() {
    const client = useAccountSecurityClient();
    return useSecurityMutation(client.linkWidget);
}

export function useUnlinkProvider() {
    const client = useAccountSecurityClient();
    return useSecurityMutation(client.unlink);
}

/** Кэш приложения принадлежит вышедшему аккаунту — его сбрасывает тот, кто уводит на вход. */
export function useSignOutEverywhere() {
    const client = useAccountSecurityClient();
    return useMutation({ mutationFn: () => client.signOutEverywhere() });
}

export function useAccountSessions() {
    const client = useAccountSecurityClient();
    return useQuery({
        queryKey: accountSecurityKeys.sessions(client.audience),
        queryFn: () => client.listSessions(),
        retry: false,
    });
}

const useSessionsMutation = <TInput, TResult>(run: (input: TInput) => Promise<TResult>) => {
    const client = useAccountSecurityClient();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: run,
        onSuccess: () =>
            queryClient.invalidateQueries({
                queryKey: accountSecurityKeys.sessions(client.audience),
            }),
    });
};

export function useEndSession() {
    const client = useAccountSecurityClient();
    return useSessionsMutation(client.endSession);
}

export function useEndOtherSessions() {
    const client = useAccountSecurityClient();
    return useSessionsMutation(() => client.endOtherSessions());
}
