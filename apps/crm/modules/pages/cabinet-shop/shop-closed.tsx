"use client";

import { useTranslations } from "next-intl";

import { Lock } from "lucide-react";

import { Card } from "@workspace/ui";

/** Витрина закрыта, пока участник не в клубе (правило клуба `catalogOutsideClub`). */
export function ShopClosed() {
    const t = useTranslations("cabinet.shop");
    return (
        <Card>
            <div className="flex items-start gap-3 px-4">
                <Lock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-1">
                    <p className="font-medium">{t("closedTitle")}</p>
                    <p className="text-sm text-muted-foreground">{t("closedText")}</p>
                </div>
            </div>
        </Card>
    );
}
