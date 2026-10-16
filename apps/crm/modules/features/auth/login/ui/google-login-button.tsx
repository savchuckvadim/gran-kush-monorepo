"use client";

import { useLocale, useTranslations } from "next-intl";

import { googleSignInUrl } from "@/modules/shared/api/google-sign-in";
import { GoogleButton } from "@/modules/shared/ui/GoogleButton";

/** Вход в CRM через Google. */
export function GoogleLoginButton() {
    const t = useTranslations("auth.login");
    const locale = useLocale();

    return (
        <GoogleButton
            href={googleSignInUrl("crm", { locale })}
            label={t("google")}
            separator={t("or")}
        />
    );
}
