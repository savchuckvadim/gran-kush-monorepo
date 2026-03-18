"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button, FieldInput } from "@workspace/ui";

import { usePasswordResetConfirm } from "@/modules/entities/auth";

const resetPasswordSchema = z
    .object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
    const t = useTranslations("auth.resetPassword");
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const mutation = usePasswordResetConfirm();

    const onSubmit = (data: ResetPasswordFormData) => {
        if (!token) {
            return;
        }
        mutation.mutate({
            token,
            newPassword: data.newPassword,
        });
    };

    if (!token) {
        return (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                {t("invalidToken")}
            </div>
        );
    }

    if (mutation.isSuccess) {
        return (
            <div className="space-y-4">
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-sm text-green-700 dark:text-green-400">
                    {t("successMessage")}
                </div>
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
                label={t("newPassword")}
                type="password"
                error={errors.newPassword?.message}
                required
                {...register("newPassword")}
                placeholder="••••••••"
            />

            <FieldInput
                label={t("confirmPassword")}
                type="password"
                error={errors.confirmPassword?.message}
                required
                {...register("confirmPassword")}
                placeholder="••••••••"
            />

            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}
