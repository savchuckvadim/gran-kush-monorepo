"use client";

import { useRouter } from "next/navigation";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import {
    confirmPasswordReset,
    loginMember,
    logoutMember,
    registerMember,
    type RegisterRequest,
    requestPasswordReset,
} from "../api/auth.api";

export const authKeys = {
    all: ["auth"] as const,
    current: () => [...authKeys.all, "current"] as const,
};

/**
 * Login mutation
 */
/** `?from=` уважается только как внутренний относительный путь — внешний open redirect не пройдёт. */
const safeInternalPath = (from: string | null): string | null => {
    if (!from || !from.startsWith("/") || from.startsWith("//") || from.includes("..")) {
        return null;
    }
    return from;
};

export function useLogin() {
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: loginMember,
        onSuccess: () => {
            // Сессия в HttpOnly-куках, клиент токенов не хранит.
            // window, а не useSearchParams: без Suspense-границы тот ломает статическую сборку
            queryClient.invalidateQueries({ queryKey: authKeys.current() });
            const from = safeInternalPath(new URLSearchParams(window.location.search).get("from"));
            router.push(from ?? localizedLink(ROUTES.PROFILE));
        },
    });
}

/**
 * Register mutation
 */
export function useRegister() {
    const router = useRouter();
    const localizedLink = useLocalizedLink();

    return useMutation({
        mutationFn: ({ data }: { data: RegisterRequest; force?: boolean }) => registerMember(data),
        onSuccess: (data, variables) => {
            // Redirect to email confirmation page
            router.push(
                localizedLink(
                    `${ROUTES.CONFIRM_EMAIL}?email=${encodeURIComponent(variables.data.email)}`
                )
            );
        },
    });
}

/**
 * Password reset request mutation
 */
export function usePasswordResetRequest() {
    return useMutation({
        mutationFn: requestPasswordReset,
    });
}

/**
 * Password reset confirm mutation
 */
export function usePasswordResetConfirm() {
    const router = useRouter();
    const localizedLink = useLocalizedLink();

    return useMutation({
        mutationFn: confirmPasswordReset,
        onSuccess: () => {
            // Redirect to login page after successful password reset
            router.push(localizedLink(ROUTES.LOGIN));
        },
    });
}

/**
 * Logout mutation
 */
export function useLogout() {
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const queryClient = useQueryClient();

    const logoutMutation = useMutation({
        mutationFn: logoutMember,
        // Кэш чистим и при упавшем logout: куки на клиенте всё равно не наши,
        // а показывать чужие данные после «выхода» нельзя
        onSettled: () => {
            queryClient.clear();
            router.push(localizedLink(ROUTES.HOME));
        },
    });
    const logout = () => {
        logoutMutation.mutate();
    };
    return { logout };
}
