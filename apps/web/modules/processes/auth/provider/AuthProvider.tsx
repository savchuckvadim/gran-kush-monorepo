"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { LoadingScreen } from "@/modules/shared";

import { AuthContext, type AuthContextValue, useAuth } from "../context/AuthContext";
import { useAuthRedirects } from "../hooks/useAuthRedirect";
import { useCurrentUserQuery } from "../hooks/useCurrentUser";
import { useSiteAuthTokens } from "../hooks/useSiteAuthTokens";
import { isProtectedRoute, stripLocalePrefix } from "../utils/auth-routing";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { hydrated, hasAccessToken } = useSiteAuthTokens();

    const protectedRoute = isProtectedRoute(stripLocalePrefix(pathname));

    const meQuery = useCurrentUserQuery(hydrated && hasAccessToken);

    useAuthRedirects({
        pathname,
        hydrated,
        hasAccessToken,
        queryClient,
        router,
        meQuery,
    });

    const status =
        typeof meQuery.error === "object" && meQuery.error ? (meQuery.error as { status?: number }).status : undefined;

    const errorMessage =
        meQuery.error instanceof Error
            ? meQuery.error.message
            : typeof meQuery.error === "object" && meQuery.error && "message" in meQuery.error
              ? String((meQuery.error as { message?: unknown }).message ?? "")
              : "";

    const isRefreshTokenMissing = /refresh token not found/i.test(errorMessage);

    const isAuthError = hasAccessToken && meQuery.isError && (status === 401 || status === 403 || isRefreshTokenMissing);

    // Loading на protected страницах, пока:
    // - нет hydration (не можем прочитать localStorage)
    // - нет токена (будет редирект)
    // - /me выполняется или завершился 401/403 (будет редирект)
    const shouldShowLoader = protectedRoute && (!hydrated || !hasAccessToken || meQuery.isPending || isAuthError);

    if (shouldShowLoader) {
        return <LoadingScreen />;
    }
  
    const value: AuthContextValue = {
        currentUser: meQuery.data ?? null,
        isAuthenticated: !!meQuery.data,
        isAuthLoading: !hydrated || (hasAccessToken && meQuery.isPending),
        isProtected: protectedRoute,
        error: meQuery.isError ? (meQuery.error as Error) : null,
        refetchCurrentUser: () => meQuery.refetch(),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth };
