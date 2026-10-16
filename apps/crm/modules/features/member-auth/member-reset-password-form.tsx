"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { confirmMemberPasswordReset } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/** Новый пароль по ссылке из письма (`?token=`). Ссылка одноразовая; сброс подтверждает и почту. */
export function MemberResetPasswordForm() {
    const t = useTranslations("cabinet.auth.reset");
    const links = useCabinetLinks();
    const token = useSearchParams().get("token");

    const schema = z
        .object({
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
        formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) });

    const reset = useMutation({
        mutationFn: (data: FormData) =>
            confirmMemberPasswordReset({ token: token ?? "", newPassword: data.password }),
    });

    if (!token) {
        return (
            <p role="alert" className="text-center text-sm text-destructive">
                {t("noToken")}
            </p>
        );
    }

    if (reset.isSuccess) {
        return (
            <div className="space-y-4 text-center" role="status">
                <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">{t("done")}</p>
                <Button asChild className="w-full">
                    <Link href={links.login}>{t("toLogin")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <form
            method="post"
            onSubmit={handleSubmit((data) => reset.mutate(data))}
            className="space-y-4"
        >
            {reset.error && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {getApiErrorMessage(reset.error)}
                </div>
            )}
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
            <Button type="submit" className="w-full" disabled={reset.isPending}>
                {reset.isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}
