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
export function useLogin() {
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: loginMember,
        onSuccess: (data) => {
            // Tokens are stored automatically by the API client middleware
            queryClient.invalidateQueries({ queryKey: authKeys.current() });
            router.push(localizedLink(ROUTES.PROFILE));
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
        mutationFn: ({ data, force }: { data: RegisterRequest; force: boolean }) =>
            registerMember(data, force),
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
        onSuccess: () => {
            queryClient.clear();
            router.push(localizedLink(ROUTES.LOGIN));
        },
    });
    const logout = () => {
        logoutMutation.mutate();
        router.push(localizedLink(ROUTES.HOME));
    };
    return { logout };
}
