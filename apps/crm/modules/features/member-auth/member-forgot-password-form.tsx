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

import { type CabinetLocale, requestMemberPasswordReset } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";

/** Запрос письма со ссылкой на сброс пароля. Ответ API не говорит, есть ли такой адрес. */
export function MemberForgotPasswordForm() {
    const t = useTranslations("cabinet.auth.forgot");
    const links = useCabinetLinks();
    const locale = useLocale() as CabinetLocale;

    const schema = z.object({ email: z.string().email(t("invalidEmail")) });
    type FormData = z.infer<typeof schema>;

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const request = useMutation({
        mutationFn: (data: FormData) => requestMemberPasswordReset({ email: data.email, locale }),
    });

    if (request.isSuccess) {
        return (
            <div className="space-y-4 text-center" role="status">
                <MailCheck className="mx-auto size-10 text-success" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t("done")}</p>
                <Button variant="outline" asChild className="w-full">
                    <Link href={links.login}>{t("back")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit((data) => request.mutate(data))} className="space-y-4">
            {request.error && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {getApiErrorMessage(request.error)}
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
            <Button type="submit" className="w-full" disabled={request.isPending}>
                {request.isPending ? t("submitting") : t("submit")}
            </Button>
            <p className="text-center text-sm">
                <Link href={links.login} className="text-primary hover:underline">
                    {t("back")}
                </Link>
            </p>
        </form>
    );
}
