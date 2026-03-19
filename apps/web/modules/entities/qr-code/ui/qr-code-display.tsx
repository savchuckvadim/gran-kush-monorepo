"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription, QrCodeDisplay as QrCodeDisplayComponent } from "@workspace/ui";

import { useMyQrCode } from "../hooks/qr-code.hook";

interface QrCodeDisplayProps {
    size?: number;
    className?: string;
}

/**
 * Display QR code for current member
 */
export function QrCodeDisplay({ size = 256, className }: QrCodeDisplayProps) {
    const t = useTranslations("profile.qrCode");
    const locale = useLocale();
    const { theme, resolvedTheme } = useTheme();
    const { data: qrCode, isLoading, error } = useMyQrCode();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">{t("loading")}</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    {t("error")}: {error.message}
                </AlertDescription>
            </Alert>
        );
    }

    if (!qrCode?.encryptedCode) {
        return (
            <div className={className}>
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t("notFound")}</AlertDescription>
                </Alert>
            </div>
        );
    }

    const isDark = resolvedTheme === "dark" || theme === "dark";

    const encryptedCode = qrCode.encryptedCode;

    // We embed a CRM scan URL into the QR so that scanning produces a clear redirect flow.
    // Your `web` env is expected to provide `NEXT_PUBLIC_CRM_URL` (CRM app base URL).
    const crmBaseUrl = process.env.NEXT_PUBLIC_CRM_URL ?? "";
    const localeParam = locale ? `&locale=${encodeURIComponent(locale)}` : "";
    const crmScanUrl = crmBaseUrl
        ? `${crmBaseUrl.replace(/\/$/, "")}/scan?code=${encodeURIComponent(encryptedCode)}${localeParam}`
        : `/scan?code=${encodeURIComponent(encryptedCode)}${localeParam}`;

    return (
        <div className={className}>
            <QrCodeDisplayComponent
                value={crmScanUrl}
                size={size}
                level="H"
                bgColor={isDark ? "#000000" : "#ffffff"}
                fgColor={isDark ? "#ffffff" : "#000000"}
                includeMargin
            />
            <p className="mt-4 text-center text-sm text-muted-foreground">
                {t("instruction")}
            </p>
        </div>
    );
}
