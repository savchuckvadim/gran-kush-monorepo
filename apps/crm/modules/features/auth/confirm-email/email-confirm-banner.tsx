"use client";

import { useTranslations } from "next-intl";

import { MailWarning } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui";

import { useMeEmployee } from "../me/hook/me-employee.hook";

import { ResendConfirmationButton } from "./resend-confirmation-button";

/** Reminds the account owner to confirm the email until the link from the letter is opened. */
export function EmailConfirmBanner() {
    const t = useTranslations("auth.confirmEmail");
    const { data: me } = useMeEmployee();

    if (!me || me.emailConfirmed) {
        return null;
    }

    return (
        <Alert className="mb-4">
            <MailWarning />
            <AlertTitle>{t("bannerTitle")}</AlertTitle>
            <AlertDescription>
                <p>{t("bannerText", { email: me.email })}</p>
                <ResendConfirmationButton className="mt-2" />
            </AlertDescription>
        </Alert>
    );
}
