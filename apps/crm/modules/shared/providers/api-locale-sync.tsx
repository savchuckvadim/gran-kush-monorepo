"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";

// Живёт дольше дерева [locale]: смена языка перемонтирует его целиком
let previousLocale: string | null = null;

/**
 * Подписи полей и статусов приходят с API уже на языке интерфейса, а кэш запросов
 * общий для всех языков. После смены языка перезапрашиваем данные с новым `Accept-Language`.
 */
export function ApiLocaleSync() {
    const locale = useLocale();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (previousLocale !== null && previousLocale !== locale) {
            void queryClient.invalidateQueries();
        }
        previousLocale = locale;
    }, [locale, queryClient]);

    return null;
}
