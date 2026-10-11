"use client";

import { Button, FieldInput } from "@workspace/ui";

import { useLoginForm } from "../hooks/useLoginForm";
import { useSubmitLoginForm } from "../hooks/useSubmitLoginForm";

export function LoginForm() {
    const { t, register, handleSubmit, errors, isSubmitting } = useLoginForm();
    const { onSubmit, isError, errorMessage, isPending } = useSubmitLoginForm();

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {errorMessage ?? t("error")}
                </div>
            )}

            <FieldInput
                label={t("email")}
                type="email"
                autoComplete="username"
                error={errors.email?.message}
                required
                {...register("email")}
                placeholder="admin@example.com"
            />

            <FieldInput
                label={t("password")}
                type="password"
                autoComplete="current-password"
                error={errors.password?.message}
                required
                {...register("password")}
                placeholder="••••••••"
            />

            <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
                {isSubmitting || isPending ? t("submitting") : t("submit")}
            </Button>
        </form>
    );
}
