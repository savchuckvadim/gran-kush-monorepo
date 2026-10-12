"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { IssuePanel, LinksList } from "@/modules/features";

/** Settings → sign-up links: the same «issue» and «issued» blocks as the dialog, side by side. */
export function RegistrationLinksSettingsPage() {
    const t = useTranslations("crm.registrationLinks");

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">{t("title")}</h1>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <Card className="p-6">
                    <h2 className="mb-4 text-lg font-semibold">{t("tabs.issue")}</h2>
                    <IssuePanel />
                </Card>
                <Card className="p-6">
                    <h2 className="mb-4 text-lg font-semibold">{t("tabs.issued")}</h2>
                    <LinksList />
                </Card>
            </div>
        </div>
    );
}
