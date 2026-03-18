"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
// import { EmployeeAuthenticationCrmService, type EmployeeLoginDto } from "@workspace/api-client/generated";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, FieldInput } from "@workspace/ui";

import { $api } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
// import { configureOpenApiClient, setSessionTokens } from "@/modules/shared/api/api";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
    const t = useTranslations("auth.login");
    const localizedLink = useLocalizedLink();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const mutation = useMutation({
        mutationFn: async (data: LoginFormData) => {
            // configureOpenApiClient();
            // return EmployeeAuthenticationCrmService.employeeAuthLogin(data as EmployeeLoginDto);
            const response = await $api.POST('/crm/auth/login', {
                body: data
            });
            return response.data;
        },
        onSuccess: (response) => {
            // setSessionTokens({
            //     accessToken: response.accessToken,
            //     refreshToken: response.refreshToken,
            // });
            window.location.href = localizedLink(ROUTES.CRM_HOME);
        },
        onError: (error) => {
            console.error("Login error:", error);
        },
    });

    const onSubmit = (data: LoginFormData) => {
        mutation.mutate(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mutation.isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {t("error")}
                </div>
            )}

            <FieldInput
                label={t("email")}
                type="email"
                error={errors.email?.message}
                required
                {...register("email")}
                placeholder="your.email@example.com"
            />

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <FieldInput
                        label={t("password")}
                        type="password"
                        error={errors.password?.message}
                        required
                        {...register("password")}
                        placeholder="••••••••"
                    />
                </div>
                <Link
                    href={localizedLink(ROUTES.FORGOT_PASSWORD)}
                    className="text-sm text-primary hover:underline"
                >
                    {t("forgotPassword")}
                </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? t("submitting") : t("submit")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                {t("noAccount")}{" "}
                <Link
                    href={localizedLink(ROUTES.REGISTER)}
                    className="text-primary hover:underline"
                >
                    {t("register")}
                </Link>
            </div>
        </form>
    );
}
