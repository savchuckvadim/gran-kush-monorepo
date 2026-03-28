"use client";

import Link from "next/link";

import { Button, FieldInput } from "@workspace/ui";

import { ROUTES } from "@/modules/shared/config/routes";

import { useLoginForm } from "../hooks/useLoginForm";
import { useSubmitLoginForm } from "../hooks/useSubmitLoginForm";


export function LoginForm() {
  

    const { 
    
         t, 
         
         register, 
         handleSubmit, 
         setError, 
          errors, 
          isSubmitting 
         } = useLoginForm();

  

    const { 
        localizedLink,
        onSubmit, 
         isError, portalSlug, 
         isPending, 

         } =
         useSubmitLoginForm(setError);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isError && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {t("error")}
                </div>
            )}

            {!portalSlug && (
                <FieldInput
                    label="Club"
                    type="text"
                    error={errors.club?.message}
                    required
                    {...register("club")}
                    placeholder="green-club"
                />
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

            <Button type="submit" className="w-full" disabled={isSubmitting || isPending}>
                {isSubmitting || isPending ? t("submitting") : t("submit")}
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
