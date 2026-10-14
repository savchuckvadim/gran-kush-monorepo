"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { assertOpenApiOk, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Field, FieldInput } from "@workspace/ui";

import { $api } from "@/modules/shared";
import { type LegalDoc, legalPageUrl } from "@/modules/shared/config/legal";
import { ROUTES } from "@/modules/shared/config/routes";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

import { PASSWORD_MIN_LENGTH, PASSWORD_RULE, toMailLocale } from "../lib/credentials";

import {
    makePortalSlug,
    PORTAL_SLUG_MAX,
    PORTAL_SLUG_MIN,
    PORTAL_SLUG_PATTERN,
} from "./lib/portal-slug";

type Translate = ReturnType<typeof useTranslations>;

const createRegistrationSchema = (t: Translate) =>
    z
        .object({
            displayName: z
                .string()
                .trim()
                .min(2, t("errors.displayName"))
                .max(100, t("errors.displayName")),
            slug: z
                .string()
                .min(PORTAL_SLUG_MIN, t("errors.slugLength"))
                .max(PORTAL_SLUG_MAX, t("errors.slugLength"))
                .regex(PORTAL_SLUG_PATTERN, t("errors.slugChars")),
            ownerName: z
                .string()
                .trim()
                .min(2, t("errors.ownerName"))
                .max(100, t("errors.ownerName")),
            email: z.string().trim().email(t("errors.email")),
            password: z
                .string()
                .min(PASSWORD_MIN_LENGTH, t("errors.passwordLength"))
                .regex(PASSWORD_RULE, t("errors.passwordRule")),
            passwordConfirmation: z.string(),
            acceptTerms: z.boolean().refine((accepted) => accepted, t("errors.acceptTerms")),
        })
        .refine((data) => data.password === data.passwordConfirmation, {
            message: t("errors.passwordMismatch"),
            path: ["passwordConfirmation"],
        });

type RegistrationFormData = z.infer<ReturnType<typeof createRegistrationSchema>>;

const legalLink = (locale: string, doc: LegalDoc) =>
    function LegalLink(chunks: ReactNode) {
        return (
            <a
                href={legalPageUrl(locale, doc)}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-primary"
            >
                {chunks}
            </a>
        );
    };

// The product site passes the API billing code: /{locale}/auth/register?plan=club-month
const usePlanFromUrl = () => {
    const plan = useSearchParams().get("plan");
    return plan && plan.length <= PORTAL_SLUG_MAX && PORTAL_SLUG_PATTERN.test(plan)
        ? plan
        : undefined;
};

/** Google-вход без клуба возвращает сюда с предзаполненным адресом. */
const useEmailFromUrl = () => {
    const email = useSearchParams().get("email");
    return email && z.string().email().safeParse(email).success ? email : undefined;
};

const usePlanName = (planCode: string | undefined) =>
    useQuery({
        queryKey: ["billing-plans"],
        enabled: Boolean(planCode),
        queryFn: () => $api.GET("/platform/billing/plans"),
        select: (response) =>
            response.data?.plans.find((plan) => plan.code === planCode)?.name ?? null,
    });

export function RegistrationForm() {
    const t = useTranslations("auth.portalRegister");
    const locale = useLocale();
    const router = useRouter();
    const localizedLink = useLocalizedLink();
    const planCode = usePlanFromUrl();
    const prefilledEmail = useEmailFromUrl();
    const { data: planName } = usePlanName(planCode);
    const [slugEdited, setSlugEdited] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitting, isSubmitted },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(createRegistrationSchema(t)),
        defaultValues: { slug: "", acceptTerms: false, email: prefilledEmail },
    });

    const slug = useWatch({ control, name: "slug" });
    const crmAddress = `/${locale}/${slug || "…"}${ROUTES.CRM_HOME}`;

    const mutation = useMutation({
        mutationFn: async (data: RegistrationFormData) => {
            const postResult = await $api.POST("/platform/portals/register", {
                body: {
                    name: data.slug,
                    displayName: data.displayName,
                    email: data.email.toLowerCase(),
                    password: data.password,
                    ownerName: data.ownerName,
                    acceptTerms: data.acceptTerms,
                    locale: toMailLocale(locale),
                    ...(planCode ? { planCode } : {}),
                },
            });
            const apiData = await assertOpenApiOk(postResult);
            return apiData.portal.name;
        },
        onError: (error) => {
            notifyApiError(error, t("errors.failed"));
        },
        onSuccess: (portalSlug) => {
            router.replace(`/${locale}/${portalSlug}${ROUTES.CRM_HOME}`);
        },
    });

    return (
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            {mutation.error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {getApiErrorMessage(mutation.error)}
                </div>
            )}
            {planName && (
                <p className="rounded-lg border bg-muted/40 p-3 text-sm">
                    {t("plan", { plan: planName })}
                </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label={t("displayName")}
                    type="text"
                    error={errors.displayName?.message}
                    required
                    {...register("displayName", {
                        onChange: (event: { target: { value: string } }) => {
                            if (!slugEdited) {
                                setValue("slug", makePortalSlug(event.target.value), {
                                    shouldValidate: isSubmitted,
                                });
                            }
                        },
                    })}
                    placeholder="Green Club"
                />
                <FieldInput
                    label={t("slug")}
                    type="text"
                    error={errors.slug?.message}
                    helperText={t("slugHelp", { url: crmAddress })}
                    required
                    autoCapitalize="none"
                    spellCheck={false}
                    {...register("slug", {
                        onChange: () => setSlugEdited(true),
                        setValueAs: (value: string) => value.trim().toLowerCase(),
                    })}
                    placeholder="green-club"
                />
            </div>

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

            <Field error={errors.acceptTerms?.message}>
                <label className="flex items-start gap-2 text-sm">
                    <input
                        type="checkbox"
                        className="mt-0.5 size-4 shrink-0 accent-primary"
                        aria-invalid={errors.acceptTerms ? "true" : undefined}
                        {...register("acceptTerms")}
                    />
                    <span>
                        {t.rich("acceptTerms", {
                            terms: legalLink(locale, "terminos"),
                            dpa: legalLink(locale, "encargo"),
                            privacy: legalLink(locale, "privacidad"),
                        })}
                    </span>
                </label>
            </Field>

            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending ? t("submitting") : t("submit")}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                {t("hasAccount")}{" "}
                <Link href={localizedLink(ROUTES.LOGIN)} className="text-primary hover:underline">
                    {t("login")}
                </Link>
            </div>
        </form>
    );
}
