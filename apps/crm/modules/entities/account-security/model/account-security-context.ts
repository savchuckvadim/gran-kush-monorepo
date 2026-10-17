"use client";

import { createContext, useContext } from "react";

import type { AccountSecurityClient } from "./account-security-client";

/** Клиент «Вход и безопасность» приложения, в котором открыт виджет. */
export const AccountSecurityContext = createContext<AccountSecurityClient | null>(null);

export function useAccountSecurityClient(): AccountSecurityClient {
    const client = useContext(AccountSecurityContext);
    if (!client) {
        throw new Error("Account security widgets need an AccountSecurityContext provider");
    }
    return client;
}
