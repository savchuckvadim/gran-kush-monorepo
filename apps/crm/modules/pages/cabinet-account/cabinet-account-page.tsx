"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import { useAccountProfile } from "@/modules/entities/cabinet-account";

import { ProfileForm } from "./profile-form";

/** «Аккаунт»: данные человека для анкет клубов (а дальше — входы и безопасность, TASK-716). */
export function CabinetAccountPage() {
    const t = useTranslations("cabinet.account");
    const profile = useAccountProfile();

    return (
        <div className="max-w-3xl space-y-6">
            <header>
                <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
            </header>

            <Card>
                <div className="space-y-4 px-4">
                    <div>
                        <h2 className="text-lg font-medium">{t("profile.title")}</h2>
                        <p className="text-sm text-muted-foreground">{t("profile.hint")}</p>
                    </div>
                    {profile.isLoading && (
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    )}
                    {profile.error && (
                        <p role="alert" className="text-sm text-destructive">
                            {getApiErrorMessage(profile.error)}
                        </p>
                    )}
                    {profile.data && <ProfileForm profile={profile.data} />}
                </div>
            </Card>
        </div>
    );
}
