"use client";

import { useLocale, useTranslations } from "next-intl";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { createClub } from "@/modules/entities/portal";
import { ROUTES } from "@/modules/shared/config/routes";

import { toMailLocale } from "../../auth/lib/credentials";
import { usePlanFromUrl, usePlanName } from "../hooks/use-plan";
import { clubFieldsShape } from "../lib/club-schema";

import { ClubFields } from "./club-fields";
import { TermsField } from "./terms-field";

/**
 * One more club for the account of the CRM session: the account becomes its owner. A Google
 * sign-in without clubs and «+ Новый клуб» in the club switcher lead here; `?plan=` from the
 * product site is kept.
 */
export function CreateClubForm() {
    const t = useTranslations("auth.portalRegister");
    const tNew = useTranslations("auth.newClub");
    const locale = useLocale();
    const planCode = usePlanFromUrl();
    const { data: planName } = usePlanName(planCode);

    const schema = z.object(clubFieldsShape(t));
    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors, isSubmitted },
    } = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        defaultValues: { slug: "", acceptTerms: false },
    });
    const slug = useWatch({ control, name: "slug" });

    const create = useMutation({
        mutationFn: (data: z.infer<typeof schema>) =>
            createClub({
                name: data.slug,
                displayName: data.displayName,
                ownerName: data.ownerName,
                acceptTerms: data.acceptTerms,
                locale: toMailLocale(locale),
                ...(planCode ? { planCode } : {}),
            }),
        // Full navigation: the CRM shell of the new club starts with a clean client state
        onSuccess: (result) =>
            window.location.assign(`/${locale}/${result.portal.name}${ROUTES.CRM_HOME}`),
    });

    return (
        <form onSubmit={handleSubmit((data) => create.mutate(data))} className="space-y-4">
            {create.error && (
                <p
                    role="alert"
                    className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    {getApiErrorMessage(create.error)}
                </p>
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
            <FieldInput
                label={t("ownerName")}
                type="text"
                autoComplete="given-name"
                error={errors.ownerName?.message}
                required
                {...register("ownerName")}
            />
            <TermsField
                registration={register("acceptTerms")}
                error={errors.acceptTerms?.message}
            />

            <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? t("submitting") : tNew("submit")}
            </Button>
        </form>
    );
}
