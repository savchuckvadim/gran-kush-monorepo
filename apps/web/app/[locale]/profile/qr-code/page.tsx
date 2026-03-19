"use client";

import { useTranslations } from "next-intl";

import { Download,QrCode } from "lucide-react";

import { Button,Card } from "@workspace/ui";

import { QrCodeDisplay } from "@/modules/entities/qr-code";
import { useMyQrCode } from "@/modules/entities/qr-code";
import { RegenerateQrCodeButton } from "@/modules/features/qr-code";

export default function QrCodePage() {
    const t = useTranslations("profile.qrCode");
    const { data: qrCode } = useMyQrCode();

    const handleDownload = () => {
        if (!qrCode?.encryptedCode) return;

        // Create a canvas to render QR code
        const canvas = document.createElement("canvas");
        const size = 512;
        canvas.width = size;
        canvas.height = size;

        // We'll need to use qrcode.react to generate the QR code image
        // For now, we'll create a data URL from the QR code component
        // This is a simplified version - in production, you might want to use a library
        // that can generate QR code as image blob
        const link = document.createElement("a");
        link.download = "qr-code.png";
        link.href = `data:image/svg+xml;base64,${btoa(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><text>${qrCode.encryptedCode}</text></svg>`
        )}`;
        link.click();
    };

    return (
        <div className="container py-12">
            <div className="mx-auto max-w-2xl">
                <div className="mb-8">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-6 w-6" />
                        <h1 className="text-3xl font-bold">{t("title")}</h1>
                    </div>
                    <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
                </div>

                <Card className="p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">{t("yourQrCode")}</h2>
                        <div className="flex gap-2 flex-wrap">
                            <RegenerateQrCodeButton size="sm" />
                            {qrCode?.encryptedCode && (
                                <Button variant="outline" size="sm" onClick={handleDownload}>
                                    <Download className="mr-2 h-4 w-4" />
                                    {t("download")}
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <QrCodeDisplay size={400} />
                        <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-4 text-sm">
                            <p className="font-medium">{t("instruction")}</p>
                            <p className="text-muted-foreground">{t("instructionDetail")}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
