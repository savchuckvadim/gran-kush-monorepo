"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Download, QrCode } from "lucide-react";

import { Button, Card } from "@workspace/ui";

import { QrCodeDisplay } from "@/modules/entities/qr-code";
import { useMyQrCode } from "@/modules/entities/qr-code";
import { RegenerateQrCodeButton } from "@/modules/features/qr-code";

export default function QrCodePage() {
    const t = useTranslations("profile.qrCode");
    const { data: qrCode } = useMyQrCode();
    const [qrSize, setQrSize] = useState(320);

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;

            // Консервативная оценка: QR не должен вылезать за края на телефонах.
            // Ограничиваем по ширине и по высоте.
            const computed = Math.min(420, Math.floor(w * 0.82), Math.floor(h * 0.42));

            setQrSize(Math.max(220, computed));
        };

        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

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
        <div className="container min-h-[100dvh] py-6 md:py-12 overflow-x-hidden">
            <div className="mx-auto flex max-w-2xl flex-col">
                <div className="mb-6 md:mb-8">
                    <div className="flex items-center gap-2">
                        <QrCode className="h-6 w-6" />
                        <h1 className="text-2xl font-bold sm:text-3xl">{t("title")}</h1>
                    </div>
                    <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
                </div>

                <Card className="flex flex-col p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
                        <h2 className="text-base font-semibold sm:text-lg">{t("yourQrCode")}</h2>
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

                    <div className="flex flex-1 flex-col items-center gap-4 sm:gap-6">
                        <QrCodeDisplay size={qrSize} />
                        <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-3 text-sm sm:p-4">
                            <p className="font-medium">{t("instruction")}</p>
                            <p className="text-muted-foreground">{t("instructionDetail")}</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
