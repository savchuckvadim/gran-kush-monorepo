"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { ResetPasswordForm } from "@/modules/features";

/** `?setup=1` — ссылка из письма «задайте пароль» для аккаунта без пароля. */
export default function ResetPasswordPage() {
    const t = useTranslations("auth.resetPassword");
    const setup = useSearchParams().get("setup") === "1";

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={setup ? t("setupTitle") : t("title")}
                description={setup ? t("setupSubtitle") : t("subtitle")}
                headerClassName="text-center"
            >
                <ResetPasswordForm />
            </Card>
        </div>
    );
}
