"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { assertOpenApiOk, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Field, FieldInput } from "@workspace/ui";

import { getRouteContext } from "@/modules/processes/auth/utils/auth-routing";
import { $api } from "@/modules/shared";
import { ROUTES, SITE_PUBLIC_URL } from "@/modules/shared/config/routes";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

const registrationSchema = z
    .object({
        displayName: z
            .string()
            .min(2, "Club display name is required")
            .max(20, "Club display name must be less than 20 characters"),
        ownerName: z
            .string()
            .min(2, "Owner name is required")
            .max(20, "Owner name must be less than 20 characters"),
        // ownerSurname: z.string().optional(),
        email: z.string().email("Invalid email"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        passwordConfirmation: z
            .string()
            .min(8, "Password confirmation must be at least 8 characters"),
        acceptTerms: z.boolean().refine((accepted) => accepted, "Accept the terms to continue"),
    })
    .refine((data) => data.password === data.passwordConfirmation, {
        message: "Passwords do not match",
        path: ["passwordConfirmation"],
    });

type RegistrationFormData = z.infer<typeof registrationSchema>;

function makePortalSlug(value: string): string {
    return value
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function RegistrationForm() {
    const router = useRouter();
    const locale = useLocale();
    const localizedLink = useLocalizedLink();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
        defaultValues: { acceptTerms: false },
    });
    const legalUrl = (doc: string) => `${SITE_PUBLIC_URL}/${locale}/legal/${doc}`;

    const mutation = useMutation({
        mutationFn: async (data: RegistrationFormData) => {
            const generatedSlug = makePortalSlug(data.displayName);
            if (generatedSlug.length < 3) {
                throw new Error("Club name is too short to generate slug");
            }

            const payload = {
                name: generatedSlug,
                displayName: data.displayName.trim(),
                email: data.email.trim().toLowerCase(),
                password: data.password,
                ownerName: data.ownerName.trim(),
                // ownerSurname: data.ownerSurname?.trim() || undefined,
                acceptTerms: data.acceptTerms,
            };

            const postResult = await $api.POST("/platform/portals/register", { body: payload });
            const apiData = await assertOpenApiOk(postResult);

            if (!apiData?.portal?.name) {
                throw new Error("Registration succeeded but portal slug was not returned");
            }

            return apiData.portal.name;
        },
        onError: (error) => {
            notifyApiError(error, "Registration failed");
        },
        onSuccess: (portalSlug) => {
            const { locale } = getRouteContext(window.location.pathname);
            router.replace(`/${locale}/${portalSlug}${ROUTES.CRM_HOME}`);
        },
    });

    const onSubmit = (data: RegistrationFormData) => {
        mutation.mutate(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {mutation.error && (
                <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                    {getApiErrorMessage(mutation.error)}
                </div>
            )}
            <FieldInput
                label="Club display name"
                type="text"
                error={errors.displayName?.message}
                required
                {...register("displayName")}
                placeholder="Green Club"
            />

            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label="Owner name"
                    type="text"
                    error={errors.ownerName?.message}
                    required
                    {...register("ownerName")}
                    placeholder="John"
                />
                <FieldInput
                    label="Email"
                    type="email"
                    error={errors.email?.message}
                    required
                    {...register("email")}
                    placeholder="owner@greenclub.com"
                />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <FieldInput
                    label="Password"
                    type="password"
                    error={errors.password?.message}
                    required
                    {...register("password")}
                    placeholder="••••••••"
                />

                <FieldInput
                    label="Password confirmation"
                    type="password"
                    error={errors.passwordConfirmation?.message}
                    required
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
                        I accept the{" "}
                        <a
                            href={legalUrl("terminos")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-primary"
                        >
                            Terms and conditions
                        </a>{" "}
                        and the{" "}
                        <a
                            href={legalUrl("encargo")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-primary"
                        >
                            Data processing agreement
                        </a>
                        , and I have read the{" "}
                        <a
                            href={legalUrl("privacidad")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-2 hover:text-primary"
                        >
                            Privacy policy
                        </a>
                    </span>
                </label>
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
                {isSubmitting || mutation.isPending
                    ? "Creating portal..."
                    : "Create portal and login"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href={localizedLink(ROUTES.LOGIN)} className="text-primary hover:underline">
                    Login
                </Link>
            </div>
        </form>
    );
}
