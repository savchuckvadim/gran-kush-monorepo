"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { LoginForm } from "@/modules/features";
import { BRAND } from "@/modules/shared/config/brand";

export default function LoginPage() {
    const t = useTranslations("auth.login");

    return (
        <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-12">
            <Card
                className="w-full max-w-md"
                title={t("title")}
                description={t("subtitle", { brand: BRAND.name })}
                headerClassName="text-center"
            >
                <LoginForm />
            </Card>
        </div>
    );
}
