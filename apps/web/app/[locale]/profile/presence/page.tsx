"use client";

import { useTranslations } from "next-intl";

import { History } from "lucide-react";

import { CurrentPresenceStatus, PresenceHistoryTable } from "@/modules/features/presence";

export default function PresenceHistoryPage() {
    const t = useTranslations("profile.presence");

    return (
        <div className="container py-12">
            <div className="mx-auto max-w-4xl">
                <div className="mb-8">
                    <div className="flex items-center gap-2">
                        <History className="h-6 w-6" />
                        <h1 className="text-3xl font-bold">{t("title")}</h1>
                    </div>
                    <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
                </div>

                <div className="space-y-6">
                    <CurrentPresenceStatus />
                    <PresenceHistoryTable page={1} limit={20} />
                </div>
            </div>
        </div>
    );
}
