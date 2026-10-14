"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

import { Button, FieldInput } from "@workspace/ui";

import { usePortal } from "@/modules/processes";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { useLoginForm } from "../hooks/useLoginForm";
import { useLoginSession } from "../hooks/useLoginSession";
import { InvalidCredentialsError, useSubmitLoginForm } from "../hooks/useSubmitLoginForm";
import { resolveClubTarget } from "../lib/club-target";

import { ClubPicker } from "./club-picker";
import { GoogleLoginButton } from "./google-login-button";

export function LoginForm() {
    const { t, register, handleSubmit, errors, isSubmitting } = useLoginForm();
    const locale = useLocale();
    const localizedLink = useLocalizedLink();
    const { portalSlug } = usePortal();
    const searchParams = useSearchParams();
    const from = searchParams.get("from");
    const urlError = searchParams.get("error");

    const session = useLoginSession();
    const login = useSubmitLoginForm(session.refetch);

    const target = session.clubs
        ? resolveClubTarget(session.clubs, locale, portalSlug, from)
        : null;

    useEffect(() => {
        if (target) {
            window.location.assign(target);
        }
    }, [target]);

    if (session.isLoading || target) {
        return <p className="text-center text-sm text-muted-foreground">{t("loadingClubs")}</p>;
    }

    if (session.clubs) {
        const deniedClub =
            portalSlug && !session.clubs.some((club) => club.slug === portalSlug)
                ? portalSlug
                : null;
        return (
            <ClubPicker
                clubs={session.clubs}
                deniedClub={deniedClub}
                onSignOut={session.signOut}
                isSigningOut={session.isSigningOut}
            />
        );
    }

    const isPending = isSubmitting || login.isPending;

    return (
        <form onSubmit={handleSubmit((data) => login.mutate(data))} className="space-y-4">
            {login.error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {login.error instanceof InvalidCredentialsError
                        ? t("error")
                        : t("genericError")}
                </div>
            )}
            {!login.error && (urlError === "google_auth" || urlError === "google_off") && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {urlError === "google_off" ? t("googleOff") : t("googleError")}
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

            <div className="space-y-2">
                <FieldInput
                    label={t("password")}
                    type="password"
                    error={errors.password?.message}
                    required
                    autoComplete="current-password"
                    {...register("password")}
                    placeholder="••••••••"
                />
                <Link
                    href={`/${locale}${ROUTES.FORGOT_PASSWORD}`}
                    className="text-sm text-primary hover:underline"
                >
                    {t("forgotPassword")}
                </Link>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? t("submitting") : t("submit")}
            </Button>

            <GoogleLoginButton />

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
