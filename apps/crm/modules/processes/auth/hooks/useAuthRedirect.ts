"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import type { QueryClient } from "@tanstack/react-query";

import { getLoginUrl } from "../utils/auth-routing";

type Params = {
    pathname: string;
    protectedRoute: boolean;
    queryClient: QueryClient;
    router: ReturnType<typeof useRouter>;
    meQuery: {
        isPending: boolean;
        isError: boolean;
        error: unknown;
    };
};

function getStatus(error: unknown): number | undefined {
    return typeof error === "object" && error ? (error as { status?: number }).status : undefined;
}

export function useAuthRedirects({
    pathname,
    protectedRoute,
    queryClient,
    router,
    meQuery,
}: Params) {
    const loginUrl = React.useMemo(() => getLoginUrl(pathname), [pathname]);

    // Protected route + unauthorized /me response -> redirect to login.
    React.useEffect(() => {
        if (!protectedRoute) return;
        if (meQuery.isPending) return;
        if (!meQuery.isError) return;

        const status = getStatus(meQuery.error);
        if (status !== 401 && status !== 403) return;

        queryClient.clear();
        router.replace(loginUrl);
    }, [
        protectedRoute,
        meQuery.isPending,
        meQuery.isError,
        meQuery.error,
        queryClient,
        router,
        loginUrl,
    ]);
}
