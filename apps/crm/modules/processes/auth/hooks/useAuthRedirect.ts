"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { QueryClient } from "@tanstack/react-query";

import { apiTokensStorage } from "@/modules/shared/api";

import { getLoginUrl, isProtectedRoute, stripLocalePrefix } from "../utils/auth-routing";

type Params = {
    pathname: string;
    hydrated: boolean;
    hasAccessToken: boolean;
    queryClient: QueryClient;
    router: ReturnType<typeof useRouter>;
    meQuery: {
        isError: boolean;
        error: unknown;
    };
};

function getStatus(error: unknown): number | undefined {
    return typeof error === "object" && error ? (error as { status?: number }).status : undefined;
}

export function useAuthRedirects({ pathname, hydrated, hasAccessToken, queryClient, router, meQuery }: Params) {
    const localeLessPath = stripLocalePrefix(pathname);
    const protectedRoute = isProtectedRoute(localeLessPath);

    const loginUrl = React.useMemo(() => getLoginUrl(pathname), [pathname]);

    // No token on protected route -> redirect to login
    React.useEffect(() => {
        if (!hydrated) return;
        if (!protectedRoute) return;
        if (hasAccessToken) return;

        router.replace(loginUrl);
    }, [hydrated, protectedRoute, hasAccessToken, loginUrl, router]);

    // Token exists but /me says 401/403 -> clear storage and redirect
    React.useEffect(() => {
        if (!hydrated) return;
        if (!protectedRoute) return;
        if (!hasAccessToken) return;
        if (!meQuery.isError) return;

        const status = getStatus(meQuery.error);
        if (status !== 401 && status !== 403) return;

        apiTokensStorage.clearTokens();
        queryClient.clear();
        router.replace(loginUrl);
    }, [hydrated, protectedRoute, hasAccessToken, loginUrl, router, meQuery.isError, meQuery.error, queryClient]);
}

