"use client";

import { useTranslations } from "next-intl";

import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@workspace/ui";

import { useRegenerateQrCode } from "@/modules/entities/qr-code";

interface RegenerateQrCodeButtonProps {
    className?: string;
    variant?: "default" | "outline" | "ghost" | "destructive" | "link";
    size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button to regenerate QR code
 */
export function RegenerateQrCodeButton({
    className,
    variant = "outline",
    size = "default",
}: RegenerateQrCodeButtonProps) {
    const t = useTranslations("profile.qrCode");
    const regenerateMutation = useRegenerateQrCode();

    return (
        <Button
            variant={variant}
            size={size}
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending}
            className={className}
        >
            {regenerateMutation.isPending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("regenerating")}
                </>
            ) : (
                <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("regenerate")}
                </>
            )}
        </Button>
    );
}
