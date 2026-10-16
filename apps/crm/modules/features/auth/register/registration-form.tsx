"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { getApiErrorCode, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { registerClub } from "@/modules/entities/portal";
import {
    ClubFields,
    clubFieldsShape,
    TermsField,
    usePlanFromUrl,
    usePlanName,
} from "@/modules/features/club-founding";
import { googleSignInUrl } from "@/modules/shared/api/google-sign-in";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";
import { GoogleButton } from "@/modules/shared/ui/GoogleButton";

import { PASSWORD_MIN_LENGTH, PASSWORD_RULE, toMailLocale } from "../lib/credentials";

/** API code of a 409 for an address that already has an account. */
const EMAIL_TAKEN = "email_taken";

type Translate = ReturnType<typeof useTranslations>;

const createRegistrationSchema = (t: Translate) =>
    z
        .object({
            ...clubFieldsShape(t),
            email: z.string().trim().email(t("errors.email")),
            password: z
                .string()
                .min(PASSWORD_MIN_LENGTH, t("errors.passwordLength"))
                .regex(PASSWORD_RULE, t("errors.passwordRule")),
            passwordConfirmation: z.string(),
        })
        .refine((data) => data.password === data.passwordConfirmation, {
            message: t("errors.passwordMismatch"),
            path: ["passwordConfirmation"],
        });

type RegistrationFormData = z.infer<ReturnType<typeof createRegistrationSchema>>;

/**
 * Registration from the product site: a club and its owner's account. With Google the account is
 * proven by Google and the club is founded on «Новый клуб» (the plan from `?plan=` goes along).
 * An address that already has an account is sent to sign in and found the club from the CRM.
 */
export function RegistrationForm() {
    const t = useTranslations("auth.portalRegister");
    const locale = useLocale();
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const planCode = usePlanFromUrl();
    const { data: planName } = usePlanName(planCode);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(createRegistrationSchema(t)),
        defaultValues: { slug: "", acceptTerms: false },
    });
    const slug = useWatch({ control, name: "slug" });

    const mutation = useMutation({
        mutationFn: async (data: RegistrationFormData) => {
            const result = await registerClub({
                name: data.slug,
                displayName: data.displayName,
                email: data.email.toLowerCase(),
                password: data.password,
                ownerName: data.ownerName,
                acceptTerms: data.acceptTerms,
                locale: toMailLocale(locale),
                ...(planCode ? { planCode } : {}),
            });
            return result.portal.name;
        },
        onSuccess: (portalSlug) => router.replace(`/${locale}/${portalSlug}${ROUTES.CRM_HOME}`),
    });
    const emailTaken = getApiErrorCode(mutation.error) === EMAIL_TAKEN;
    const newClubPath = `/${locale}${ROUTES.NEW_CLUB}${planCode ? `?plan=${planCode}` : ""}`;

    return (
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            {mutation.error && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {emailTaken ? (
                        <>
                            {t("errors.emailTaken")}{" "}
                            <Link
                                href={`${localizedLink(ROUTES.LOGIN)}?from=${encodeURIComponent(newClubPath)}`}
                                className="font-medium underline underline-offset-2"
                            >
                                {t("login")}
                            </Link>
                        </>
                    ) : (
                        getApiErrorMessage(mutation.error)
                    )}
                </div>
            )}
            {planName && (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm">
                    {t("plan", { plan: planName })}
                </p>
            )}

            <ClubFields
                displayName={register("displayName")}
                slug={register("slug", {
                    setValueAs: (value: string) => value.trim().toLowerCase(),
                })}
                errors={{ displayName: errors.displayName?.message, slug: errors.slug?.message }}
                slugValue={slug}
                setSlug={(value) => setValue("slug", value, { shouldValidate: isSubmitted })}
            />

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("ownerName")}
                    type="text"
                    error={errors.ownerName?.message}
                    required
                    {...register("ownerName")}
                />
                <FieldInput
                    label={t("email")}
                    type="email"
                    error={errors.email?.message}
                    required
                    autoComplete="email"
                    {...register("email")}
                    placeholder="owner@greenclub.com"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("password")}
                    type="password"
                    error={errors.password?.message}
                    helperText={t("passwordHelp")}
                    required
                    autoComplete="new-password"
                    {...register("password")}
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
            </div>

            <TermsField
                registration={register("acceptTerms")}
                error={errors.acceptTerms?.message}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? t("submitting") : t("submit")}
            </Button>

            <GoogleButton
                href={googleSignInUrl("crm", {
                    locale,
                    intent: { kind: "club_signup" },
                    returnTo: newClubPath,
                })}
                label={t("google")}
                separator={t("or")}
            />

            <div className="text-center text-sm text-muted-foreground">
                {t("hasAccount")}{" "}
                <Link href={localizedLink(ROUTES.LOGIN)} className="text-primary hover:underline">
                    {t("login")}
                </Link>
            </div>
        </form>
    );
}
