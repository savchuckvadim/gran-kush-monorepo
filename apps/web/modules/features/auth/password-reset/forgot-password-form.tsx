"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, FieldInput } from "@workspace/ui";

import { usePasswordResetRequest } from "@/modules/entities/auth";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
    const t = useTranslations("auth.forgotPassword");
    const localizedLink = useLocalizedLink();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const mutation = usePasswordResetRequest();

    const onSubmit = (data: ForgotPasswordFormData) => {
        mutation.mutate(data);
    };

    if (mutation.isSuccess) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                    {t("successMessage")}
                </div>
                <Button variant="outline" className="w-full" asChild>
                    <Link href={localizedLink(ROUTES.LOGIN)}>{t("backToLogin")}</Link>
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mutation.isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {mutation.error instanceof Error
                        ? mutation.error.message
                        : t("error")}
                </div>
            )}

            <p className="text-sm text-muted-foreground">{t("description")}</p>

            <FieldInput
                label={t("email")}
                type="email"
                error={errors.email?.message}
                required
                {...register("email")}
                placeholder="your.email@example.com"
            />

            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? t("submitting") : t("submit")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                <Link
                    href={localizedLink(ROUTES.LOGIN)}
                    className="text-primary hover:underline"
                >
                    {t("backToLogin")}
                </Link>
            </div>
        </form>
    );
}
