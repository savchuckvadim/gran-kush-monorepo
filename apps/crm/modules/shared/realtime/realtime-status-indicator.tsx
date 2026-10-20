"use client";

import { useTranslations } from "next-intl";

import { WifiOff } from "lucide-react";

import { useRealtimeStatus } from "./realtime-context";

/** Значок в шапке, пока нет связи с сервером; при связи ничего не показывает. */
export function RealtimeStatusIndicator() {
    const t = useTranslations("common.realtime");
    const status = useRealtimeStatus();
    if (status !== "offline") return null;

    return (
        <span
            role="status"
            title={t("offline")}
            className="inline-flex size-9 items-center justify-center text-muted-foreground"
        >
            <WifiOff className="size-4" aria-hidden="true" />
            <span className="sr-only">{t("offline")}</span>
        </span>
    );
}
