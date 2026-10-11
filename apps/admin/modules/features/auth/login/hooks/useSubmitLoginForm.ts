import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";

import { ApiClientError, getApiErrorMessage } from "@workspace/api-client/core";

import { loginPlatformAdmin } from "@/modules/entities/auth";
import { ROUTES, useLocalizedLink } from "@/modules/shared";

import { LoginFormData } from "../type/login-form.type";

export function useSubmitLoginForm() {
    const localizedLink = useLocalizedLink();
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: (data: LoginFormData) => loginPlatformAdmin(data),
        onSuccess: () => {
            router.replace(localizedLink(ROUTES.CLUBS));
        },
    });

    const isInvalidCredentials =
        mutation.error instanceof ApiClientError && mutation.error.status === 401;

    return {
        onSubmit: (data: LoginFormData) => mutation.mutate(data),
        isPending: mutation.isPending || mutation.isSuccess,
        isError: mutation.isError,
        // 401 — неверная пара email/пароль, остальное (429, сеть) показываем как есть
        errorMessage:
            mutation.isError && !isInvalidCredentials ? getApiErrorMessage(mutation.error) : null,
    };
}
