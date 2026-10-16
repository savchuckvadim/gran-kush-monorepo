"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { registerMember } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";

/** Пароль по правилам API: от 8 знаков, заглавная, строчная и цифра. */
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Регистрация аккаунта участника. Клуба здесь нет: он появляется позже, по ссылке или приглашению.
 * Войти можно только после подтверждения почты, поэтому после успеха — экран «проверьте почту».
 */
export function MemberRegisterForm() {
    const t = useTranslations("cabinet.auth.register");
    const links = useCabinetLinks();
    const locale = useLocale();

    const schema = z
        .object({
            email: z.string().email(t("invalidEmail")),
            password: z.string().regex(PASSWORD_RULE, t("passwordRule")),
            confirm: z.string(),
        })
        .refine((value) => value.password === value.confirm, {
            path: ["confirm"],
            message: t("mismatch"),
        });
    type FormData = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        getValues,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const signUp = useMutation({
        mutationFn: (data: FormData) =>
            registerMember({ email: data.email, password: data.password }),
    });

    if (signUp.isSuccess) {
        return (
            <div className="space-y-4 text-center" role="status">
                <MailCheck className="mx-auto size-10 text-success" aria-hidden="true" />
                <h2 className="text-lg font-semibold">{t("doneTitle")}</h2>
                <p className="text-sm text-muted-foreground">
                    {t("doneText", { email: getValues("email") })}
                </p>
                <Button variant="outline" asChild className="w-full">
                    <Link href={links.login}>{t("toLogin")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <form
            method="post"
            onSubmit={handleSubmit((data) => signUp.mutate(data))}
            className="space-y-4"
            lang={locale}
        >
            {signUp.error && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {getApiErrorMessage(signUp.error)}
                </div>
            )}
            <FieldInput
                label={t("email")}
                type="email"
                autoComplete="email"
                error={errors.email?.message}
                required
                {...register("email")}
            />
            <FieldInput
                label={t("password")}
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                required
                {...register("password")}
            />
            <FieldInput
                label={t("confirm")}
                type="password"
                autoComplete="new-password"
                error={errors.confirm?.message}
                required
                {...register("confirm")}
            />
            <Button type="submit" className="w-full" disabled={signUp.isPending}>
                {signUp.isPending ? t("submitting") : t("submit")}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
                {t("haveAccount")}{" "}
                <Link href={links.login} className="text-primary hover:underline">
                    {t("login")}
                </Link>
            </p>
        </form>
    );
}
