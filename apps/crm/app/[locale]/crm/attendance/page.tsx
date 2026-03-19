"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
    CurrentlyPresentList,
    PresenceStatsCard,
    QrScannerDialog,
    SessionsTable,
} from "@/modules/widgets/attendance";

export default function CrmAttendancePage() {
    const t = useTranslations("crm.attendance");
    const searchParams = useSearchParams();

    // Option B: код из QR-ссылки (/scan?code=...)
    const autoScanCode = searchParams.get("scan") ?? undefined;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                <QrScannerDialog autoScanCode={autoScanCode} />
            </div>

            {/* Статистика */}
            <PresenceStatsCard />

            {/* Текущие присутствующие */}
            <CurrentlyPresentList />

            {/* История сессий */}
            <SessionsTable />
        </div>
    );
}
