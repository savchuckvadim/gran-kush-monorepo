"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ApiClientError, assertOpenApiOk, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { $api } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
import { passwordSchema } from "@/modules/shared/lib/password-schema";

import { isDeadTokenStatus } from "../lib/credentials";

type Translate = ReturnType<typeof useTranslations>;

const createSchema = (t: Translate) =>
    z
        .object({
            newPassword: passwordSchema({
                length: t("errors.passwordLength"),
                characters: t("errors.passwordRule"),
            }),
            passwordConfirmation: z.string(),
        })
        .refine((data) => data.newPassword === data.passwordConfirmation, {
            message: t("errors.passwordMismatch"),
            path: ["passwordConfirmation"],
        });

type ResetPasswordFormData = z.infer<ReturnType<typeof createSchema>>;

export function ResetPasswordForm() {
    const t = useTranslations("auth.resetPassword");
    const locale = useLocale();
    const token = useSearchParams().get("token");
    const loginHref = `/${locale}${ROUTES.LOGIN}`;
    const forgotHref = `/${locale}${ROUTES.FORGOT_PASSWORD}`;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({ resolver: zodResolver(createSchema(t)) });

    const mutation = useMutation({
        mutationFn: async ({ newPassword }: ResetPasswordFormData) =>
            assertOpenApiOk(
                await $api.POST("/crm/auth/password/reset/confirm", {
                    body: { token: token ?? "", newPassword },
                })
            ),
    });

    const linkIsDead =
        !token ||
        (mutation.error instanceof ApiClientError && isDeadTokenStatus(mutation.error.status));

    if (linkIsDead) {
        return (
            <div className="space-y-4">
                <p className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                    {t("invalidLink")}
                </p>
                <Button asChild className="w-full">
                    <Link href={forgotHref}>{t("requestNewLink")}</Link>
                </Button>
            </div>
        );
    }

    if (mutation.isSuccess) {
        return (
            <div className="space-y-4">
                <p className="rounded-lg border bg-muted/40 p-4 text-sm">{t("success")}</p>
                <Button asChild className="w-full">
                    <Link href={loginHref}>{t("goToLogin")}</Link>
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
                label={t("newPassword")}
                type="password"
                error={errors.newPassword?.message}
                helperText={t("passwordHelp")}
                required
                autoComplete="new-password"
                {...register("newPassword")}
                placeholder="••••••••"
            />
            <FieldInput
                label={t("passwordConfirmation")}
                type="password"
                error={errors.passwordConfirmation?.message}
                required
                autoComplete="new-password"
                {...register("passwordConfirmation")}
                placeholder="••••••••"
            />

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}
