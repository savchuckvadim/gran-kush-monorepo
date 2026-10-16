"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { Loader2 } from "lucide-react";

import type { SchemaMemberMeResponseDto } from "@workspace/api-client/core";

import { useLkMe } from "@/modules/entities/lk-account";

interface MemberAuthValue {
    user: SchemaMemberMeResponseDto;
}

const MemberAuthContext = createContext<MemberAuthValue | null>(null);

/**
 * Охрана кабинета: пока не известно, есть ли сессия, показывает загрузку; нет сессии — уводит на
 * вход с возвратом на текущую страницу. Детей рендерит только с аккаунтом, поэтому внутри
 * `useMemberAuth()` всегда возвращает пользователя.
 *
 * Сюда же попадает человек с протухшей, но живой на вид кукой (прокси пускает по её наличию):
 * `/lk/auth/me` отвечает 401 после неудачного refresh, и вход начинается заново.
 */
export function MemberAuthProvider({ children }: { children: React.ReactNode }) {
    const { data: user, isLoading, isError } = useLkMe();
    const router = useRouter();
    const locale = useLocale();
    const pathname = usePathname();

    const mustLogIn = !isLoading && !isError && user === null;
    useEffect(() => {
        if (mustLogIn) {
            router.replace(`/${locale}/auth/login?from=${encodeURIComponent(pathname)}`);
        }
    }, [mustLogIn, router, locale, pathname]);

    const value = useMemo(() => (user ? { user } : null), [user]);

    if (!value) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    return <MemberAuthContext.Provider value={value}>{children}</MemberAuthContext.Provider>;
}

export function useMemberAuth(): MemberAuthValue {
    const value = useContext(MemberAuthContext);
    if (!value) {
        throw new Error("useMemberAuth must be used within <MemberAuthProvider />");
    }
    return value;
}
