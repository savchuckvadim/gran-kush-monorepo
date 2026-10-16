"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui";

import { useMyPresenceStatus } from "@/modules/entities/cabinet-club";

/** «Сейчас в клубе» / «Не в клубе»: от открытого визита зависят QR-статус и витрина. */
export function PresenceBadge({ slug }: { slug: string }) {
    const t = useTranslations("cabinet.club");
    const presence = useMyPresenceStatus(slug);
    if (!presence.data) return null;
    const present = presence.data.isPresent;
    return (
        <Badge variant={present ? "default" : "outline"}>
            {present ? t("inClub") : t("outsideClub")}
        </Badge>
    );
}
