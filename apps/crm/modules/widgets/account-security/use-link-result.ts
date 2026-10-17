"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import type { SignInProviderKey } from "@/modules/entities/account-security";

const LINKED = "linked";

/**
 * Исход привязки редиректом: API возвращает сюда с параметром по имени провайдера —
 * `?google=linked` или код отказа (`google_taken`). Тост показывается один раз, параметр
 * убирается из адреса, чтобы обновление страницы его не повторило.
 */
export function useLinkResult(providers: SignInProviderKey[], onLinked: () => void): void {
    const t = useTranslations("account.security");
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const provider = providers.find((key) => params.has(key));
    const result = provider ? params.get(provider) : null;

    useEffect(() => {
        if (!provider || !result) return;
        if (result === LINKED) {
            toast.success(t(`${provider}.result.linked`));
            onLinked();
        } else {
            const key = `${provider}.result.${result}`;
            toast.error(t.has(key) ? t(key) : t(`${provider}.result.failed`));
        }
        const rest = new URLSearchParams(params.toString());
        rest.delete(provider);
        const query = rest.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [provider, result, params, pathname, router, t, onLinked]);
}
