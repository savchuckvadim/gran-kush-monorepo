"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { History, QrCode, User } from "lucide-react";

import { Button,Card } from "@workspace/ui";

import { QrCodeDisplay } from "@/modules/entities/qr-code";
import { CurrentPresenceStatus } from "@/modules/features/presence";
import { RegenerateQrCodeButton } from "@/modules/features/qr-code";
import { ROUTES } from "@/modules/shared/config/routes";
import { useLocalizedLink } from "@/modules/shared/lib/use-localized-link";

export function MemberDashboard() {
    const t = useTranslations("profile.dashboard");
    const localizedLink = useLocalizedLink();

    return (
        <div className="space-y-6">
            {/* Current Presence Status */}
            <CurrentPresenceStatus />

            {/* QR Code Section */}
            <Card className="p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">{t("qrCode.title")}</h2>
                    </div>
                    <div className="flex gap-2">
                        <RegenerateQrCodeButton size="sm" />
                        <Button variant="outline" size="sm" asChild>
                            <Link href={localizedLink(`${ROUTES.PROFILE}/qr-code`)}>
                                {t("qrCode.viewFull")}
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="flex justify-center">
                    <QrCodeDisplay size={200} />
                </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6">
                <h2 className="mb-4 text-lg font-semibold">{t("quickActions")}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" asChild>
                        <Link href={localizedLink(`${ROUTES.PROFILE}/presence`)}>
                            <History className="mr-2 h-4 w-4" />
                            {t("viewHistory")}
                        </Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href={localizedLink(ROUTES.PROFILE_SETTINGS)}>
                            <User className="mr-2 h-4 w-4" />
                            {t("settings")}
                        </Link>
                    </Button>
                </div>
            </Card>
        </div>
    );
}
