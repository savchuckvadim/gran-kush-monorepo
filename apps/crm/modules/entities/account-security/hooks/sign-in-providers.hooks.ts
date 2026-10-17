"use client";

import { useQuery } from "@tanstack/react-query";

import { cabinetAccountSecurity } from "../api/cabinet-account-security.client";
import { crmAccountSecurity } from "../api/crm-account-security.client";
import type {
    AccountAudience,
    AccountSecurityClient,
    SignInProviderKey,
} from "../model/account-security-client";

import { accountSecurityKeys } from "./account-security.hooks";

const CLIENTS: Record<AccountAudience, AccountSecurityClient> = {
    crm: crmAccountSecurity,
    cabinet: cabinetAccountSecurity,
};

/**
 * Способы входа приложения из реестра API (`/{aud}/auth/providers`) — для кнопок входа,
 * регистрации и приглашений. Набор меняется только с деплоем: спрашиваем один раз за страницу.
 */
export function useAudienceProviders(audience: AccountAudience) {
    return useQuery({
        queryKey: accountSecurityKeys.providers(audience),
        queryFn: () => CLIENTS[audience].listProviders(),
        staleTime: Infinity,
        retry: false,
    });
}

/** Провайдер настроен в приложении; пока ответа нет — `false`, чтобы не показать лишнюю кнопку. */
export function useProviderAvailable(audience: AccountAudience, key: SignInProviderKey): boolean {
    return useAudienceProviders(audience).data?.some((provider) => provider.key === key) ?? false;
}

/** id бота Telegram приложения или `null`, если бот не настроен — тогда кнопки нет. */
export function useTelegramBotId(audience: AccountAudience): number | null {
    const botId = useAudienceProviders(audience).data?.find((p) => p.key === "telegram")?.config
        .botId;
    return typeof botId === "number" ? botId : null;
}
