"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { useQueryClient } from "@tanstack/react-query";

import { LoadingScreen } from "@/modules/shared";

import { AuthContext, type AuthContextValue, useAuth } from "../context/AuthContext";
import { useAuthRedirects } from "../hooks/useAuthRedirect";
import { useCurrentUserQuery } from "../hooks/useCurrentUser";
import { isProtectedRoute, stripLocalePrefix } from "../utils/auth-routing";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();

    const protectedRoute = isProtectedRoute(stripLocalePrefix(pathname));
    const meQuery = useCurrentUserQuery(protectedRoute);

    useAuthRedirects({
        pathname,
        protectedRoute,
        queryClient,
        router,
        meQuery,
    });

    const status =
        typeof meQuery.error === "object" && meQuery.error
            ? (meQuery.error as { status?: number }).status
            : undefined;

    const isAuthError = protectedRoute && meQuery.isError && (status === 401 || status === 403);
    const shouldShowLoader = protectedRoute && (meQuery.isPending || isAuthError);

    if (shouldShowLoader) {
        return <LoadingScreen />;
    }

    const value: AuthContextValue = {
        currentUser: meQuery.data ?? null,
        isAuthenticated: !!meQuery.data,
        isAuthLoading: protectedRoute && meQuery.isPending,
        isProtected: protectedRoute,
        error: meQuery.isError ? (meQuery.error as Error) : null,
        refetchCurrentUser: () => meQuery.refetch(),
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { useAuth };
