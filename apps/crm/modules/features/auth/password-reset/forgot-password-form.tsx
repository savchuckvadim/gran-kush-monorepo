"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { assertOpenApiOk, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { $api } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";

import { toMailLocale } from "../lib/credentials";

type Translate = ReturnType<typeof useTranslations>;

const createSchema = (t: Translate) =>
    z.object({
        email: z.string().trim().email(t("emailInvalid")),
    });

type ForgotPasswordFormData = z.infer<ReturnType<typeof createSchema>>;

export function ForgotPasswordForm() {
    const t = useTranslations("auth.forgotPassword");
    const locale = useLocale();
    const loginHref = `/${locale}${ROUTES.LOGIN}`;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(createSchema(t)) });

    const mutation = useMutation({
        mutationFn: async ({ email }: ForgotPasswordFormData) =>
            assertOpenApiOk(
                await $api.POST("/crm/auth/password/reset", {
                    body: { email: email.toLowerCase(), locale: toMailLocale(locale) },
                })
            ),
    });

    if (mutation.isSuccess) {
        return (
            <div className="space-y-4">
                <p className="rounded-lg border bg-muted/40 p-4 text-sm">{t("sent")}</p>
                <Button asChild className="w-full">
                    <Link href={loginHref}>{t("backToLogin")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            {mutation.error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {getApiErrorMessage(mutation.error)}
                </div>
            )}

            <FieldInput
                label={t("email")}
                type="email"
                error={errors.email?.message}
                required
                autoComplete="email"
                {...register("email")}
                placeholder="your.email@example.com"
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? t("submitting") : t("submit")}
            </Button>

            <div className="text-center text-sm">
                <Link href={loginHref} className="text-primary hover:underline">
                    {t("backToLogin")}
                </Link>
            </div>
        </form>
    );
}
