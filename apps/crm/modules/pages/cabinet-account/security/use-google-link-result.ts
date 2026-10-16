"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

/** Параметр, с которым API возвращает на страницу аккаунта после привязки Google. */
const RESULT_PARAM = "google";
const KNOWN_FAILURES = ["google_taken", "google_other_linked", "google_unverified", "google_off"];

/**
 * Исход привязки Google: API возвращает сюда с `?google=linked` или причиной. Показываем тост
 * один раз и убираем параметр из адреса, чтобы обновление страницы его не повторило.
 */
export function useGoogleLinkResult(onLinked: () => void): void {
    const t = useTranslations("cabinet.account.security.google.result");
    const params = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const result = params.get(RESULT_PARAM);

    useEffect(() => {
        if (!result) return;
        if (result === "linked") {
            toast.success(t("linked"));
            onLinked();
        } else {
            toast.error(t(KNOWN_FAILURES.includes(result) ? result : "failed"));
        }
        const rest = new URLSearchParams(params.toString());
        rest.delete(RESULT_PARAM);
        const query = rest.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, [result, params, pathname, router, t, onLinked]);
}
