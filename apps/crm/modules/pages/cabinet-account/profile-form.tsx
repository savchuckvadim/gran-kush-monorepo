"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useForm } from "react-hook-form";

import type { SchemaAccountProfileDto } from "@workspace/api-client/core";
import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, FieldInput } from "@workspace/ui";

import { useSaveAccountProfile } from "@/modules/entities/cabinet-account";

interface ProfileValues {
    firstName: string;
    lastName: string;
    birthday: string;
    phone: string;
    address: string;
}

const toValues = (profile: SchemaAccountProfileDto): ProfileValues => ({
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    birthday: profile.birthday ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
});

/**
 * Профиль аккаунта: им предзаполняются анкеты клубов, куда человек вступает. Уже заполненные
 * анкеты клубов не меняются — у каждого клуба своя запись.
 */
export function ProfileForm({ profile }: { profile: SchemaAccountProfileDto }) {
    const t = useTranslations("cabinet.account.profile");
    const save = useSaveAccountProfile();
    const form = useForm<ProfileValues>({ defaultValues: toValues(profile) });

    useEffect(() => form.reset(toValues(profile)), [profile, form]);

    return (
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
            <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                    label={t("firstName")}
                    maxLength={120}
                    {...form.register("firstName")}
                />
                <FieldInput label={t("lastName")} maxLength={120} {...form.register("lastName")} />
                <FieldInput label={t("birthday")} type="date" {...form.register("birthday")} />
                <FieldInput
                    label={t("phone")}
                    type="tel"
                    maxLength={40}
                    {...form.register("phone")}
                />
            </div>
            <FieldInput label={t("address")} maxLength={500} {...form.register("address")} />

            {save.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(save.error)}
                </p>
            )}
            <div className="flex items-center gap-3">
                <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
                    {save.isPending ? t("saving") : t("save")}
                </Button>
                {save.isSuccess && !form.formState.isDirty && (
                    <span className="text-sm text-muted-foreground">{t("saved")}</span>
                )}
            </div>
        </form>
    );
}
