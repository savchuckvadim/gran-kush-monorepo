"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { assertOpenApiOk, getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { getRouteContext } from "@/modules/processes/auth/utils/auth-routing";
import { $api } from "@/modules/shared";
import { ROUTES } from "@/modules/shared/config/routes";
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
    const localizedLink = useLocalizedLink();
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RegistrationFormData>({
        resolver: zodResolver(registrationSchema),
    });

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
