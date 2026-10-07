"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { SkinGallery, SkinOptions } from "@/modules/features/skin-picker";

export function AppearanceSettingsPage() {
    const t = useTranslations("crm.appearance");

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>

            <Card padding="sm" className="max-w-3xl py-1">
                <SkinOptions />
            </Card>

            <SkinGallery className="md:grid-cols-2 2xl:grid-cols-3" />
        </div>
    );
}
