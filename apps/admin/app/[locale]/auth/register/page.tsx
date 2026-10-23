"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { RegistrationForm } from "@/modules/features/auth";
import { BRAND } from "@/modules/shared/config/brand";

export default function RegisterPage() {
    const t = useTranslations("auth.register");

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-4xl"
                title={t("title")}
                description={t("subtitle", { brand: BRAND.name })}
                headerClassName="text-center"
            >
                <RegistrationForm />
            </Card>
        </div>
    );
}
