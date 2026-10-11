"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { ApiClientError } from "@workspace/api-client/core";

const isUnauthorized = (error: unknown): boolean =>
    error instanceof ApiClientError && error.status === 401;

/**
 * Токен платформенного админа живёт 8 часов и не обновляется: любой 401 от API
 * (сервер админки при этом стирает cookie) отправляет на вход.
 */
export const useSessionExpiredRedirect = (loginHref: string): void => {
    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        const redirect = () => {
            queryClient.clear();
            router.replace(loginHref);
        };
        const unsubscribeQueries = queryClient.getQueryCache().subscribe((event) => {
            if (event.type === "updated" && event.action.type === "error") {
                if (isUnauthorized(event.action.error)) redirect();
            }
        });
        const unsubscribeMutations = queryClient.getMutationCache().subscribe((event) => {
            if (event.type === "updated" && event.action.type === "error") {
                if (isUnauthorized(event.action.error)) redirect();
            }
        });
        return () => {
            unsubscribeQueries();
            unsubscribeMutations();
        };
    }, [queryClient, router, loginHref]);
};
