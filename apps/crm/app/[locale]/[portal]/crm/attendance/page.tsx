"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    const router = useRouter();
    const pathname = usePathname();

    // Option B: код из QR-ссылки (/scan?code=...)
    const autoScanCode = searchParams.get("scan") ?? undefined;
    // Кнопка сканера в шапке: ?scanner=<время клика>; новый ключ заново открывает диалог
    const scannerKey = searchParams.get("scanner");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
                </div>
                <QrScannerDialog
                    key={scannerKey ?? "page"}
                    autoScanCode={autoScanCode}
                    autoOpen={Boolean(scannerKey)}
                    onClosed={scannerKey ? () => router.replace(pathname) : undefined}
                />
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
