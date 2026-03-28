import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";
import { UseFormSetError } from "react-hook-form";

import { usePortal } from "@/modules/processes";
import { getRouteContext } from "@/modules/processes/auth/utils/auth-routing";
import { $api, ROUTES, useLocalizedLink } from "@/modules/shared";

import { LoginFormData } from "../type/login-form.type";

export function useSubmitLoginForm(setError: UseFormSetError<LoginFormData>) {
    const { portalSlug } = usePortal();
    const localizedLink = useLocalizedLink();
    const router = useRouter();

    const mutation = useMutation({
        mutationFn: async (data: LoginFormData) => {
            const effectivePortalSlug = (portalSlug ?? data.club ?? "").trim().toLowerCase();
            if (!effectivePortalSlug) {
                throw new Error("Club is required");
            }
            // configureOpenApiClient();
            // return EmployeeAuthenticationCrmService.employeeAuthLogin(data as EmployeeLoginDto);
            const response = await $api.POST("/crm/auth/login", {
                body: {
                    email: data.email,
                    password: data.password,
                    domain: effectivePortalSlug,

                },
                headers: { "x-portal-slug": effectivePortalSlug },
            });
            if (!response.response.ok) {
                throw new Error(`Login failed: ${response.response.status}`);
            }
            return { effectivePortalSlug };
        },
        onSuccess: ({ effectivePortalSlug }) => {
            // setSessionTokens({
            //     accessToken: response.accessToken,
            //     refreshToken: response.refreshToken,
            // });
            if (portalSlug) {
                window.location.href = localizedLink(ROUTES.CRM_HOME);
                return;
            }
            const { locale } = getRouteContext(window.location.pathname);
            router.replace(`/${locale}/${effectivePortalSlug}${ROUTES.CRM_HOME}`);
        },
        onError: (error) => {
            console.error("Login error:", error);
            if (!portalSlug) {
                setError("club", { message: "Club is required or not found" });
            }
        },
    });

    const onSubmit = (data: LoginFormData) => {
        mutation.mutate(data);
    };
    return {
        onSubmit, mutation, isError: mutation.isError, portalSlug,
        localizedLink,

        isPending: mutation.isPending,
        isSuccess: mutation.isSuccess,

        isIdle: mutation.isIdle,

    };
}