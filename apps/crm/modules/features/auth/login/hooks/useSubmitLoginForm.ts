import { useMutation } from "@tanstack/react-query";

import { $api } from "@/modules/shared";

import { LoginFormData } from "../type/login-form.type";

/** 401 from /crm/auth/login: wrong email or password, shown as such rather than a generic failure. */
export class InvalidCredentialsError extends Error {}

export function useSubmitLoginForm(onSignedIn: () => void) {
    return useMutation({
        mutationFn: async (data: LoginFormData) => {
            const response = await $api.POST("/crm/auth/login", {
                body: { email: data.email, password: data.password },
            });
            if (response.response.status === 401) {
                throw new InvalidCredentialsError();
            }
            if (!response.response.ok) {
                throw new Error(`Login failed: ${response.response.status}`);
            }
        },
        onSuccess: onSignedIn,
    });
}
