"use client";

import { useLocale, useTranslations } from "next-intl";

import { useProviderAvailable } from "@/modules/entities/account-security";
import { googleSignInUrl } from "@/modules/shared/api/google-sign-in";
import { GoogleButton } from "@/modules/shared/ui/GoogleButton";

/** Вход в CRM через Google; Google не настроен для CRM — кнопки нет. */
export function GoogleLoginButton() {
    const t = useTranslations("auth.login");
    const locale = useLocale();
    const enabled = useProviderAvailable("crm", "google");
    if (!enabled) return null;

    return (
        <GoogleButton
            href={googleSignInUrl("crm", { locale })}
            label={t("google")}
            separator={t("or")}
        />
    );
}
