"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import {
    AccountSecurityContext,
    cabinetAccountSecurity,
} from "@/modules/entities/account-security";
import { cabinetKeys, useAccountProfile } from "@/modules/entities/cabinet-account";
import { useCabinetLinks } from "@/modules/processes/member-auth";
import { SecurityCard } from "@/modules/widgets/account-security";

import { ProfileForm } from "./profile-form";

/** «Аккаунт»: данные человека для анкет клубов, вход и безопасность (TASK-716). */
export function CabinetAccountPage() {
    const t = useTranslations("cabinet.account");
    const profile = useAccountProfile();
    const router = useRouter();
    const links = useCabinetLinks();
    const queryClient = useQueryClient();
    // кэш кабинета принадлежит вышедшему аккаунту
    const onSignedOut = () => {
        queryClient.removeQueries({ queryKey: cabinetKeys.all });
        router.replace(links.login);
    };

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

            <AccountSecurityContext.Provider value={cabinetAccountSecurity}>
                <SecurityCard onSignedOut={onSignedOut} />
            </AccountSecurityContext.Provider>
        </div>
    );
}
