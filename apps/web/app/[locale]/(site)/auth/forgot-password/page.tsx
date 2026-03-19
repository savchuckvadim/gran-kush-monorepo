"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { ForgotPasswordForm } from "@/modules/features/auth";

export default function ForgotPasswordPage() {
    const t = useTranslations("auth.forgotPassword");

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={t("title")}
                description={t("subtitle")}
                headerClassName="text-center"
            >
                <ForgotPasswordForm />
            </Card>
        </div>
    );
}
