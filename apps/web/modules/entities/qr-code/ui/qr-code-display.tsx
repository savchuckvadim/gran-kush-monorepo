"use client";

import { useTranslations } from "next-intl";
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

    return (
        <div className={className}>
            <QrCodeDisplayComponent
                value={qrCode.encryptedCode}
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
