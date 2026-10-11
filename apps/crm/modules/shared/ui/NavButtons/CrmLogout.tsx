"use client";

import { usePathname, useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { $api } from "@/modules/shared/api";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

/** Выход из CRM: отзыв сессии в API, очистка кэша, переход на вход. */
export function useCrmLogout() {
    const localizedLink = useLocalizedLink();
    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await $api.POST("/crm/auth/logout");
        },
        onSettled: () => {
            queryClient.clear();
            const loginUrl = localizedLink(ROUTES.LOGIN);
            if (pathname !== loginUrl) {
                router.replace(loginUrl);
            }
        },
    });
}
