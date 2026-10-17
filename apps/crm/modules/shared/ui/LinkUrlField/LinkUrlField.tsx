"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Copy, ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";

import { Button, Input, QrCodeDisplay } from "@workspace/ui";

/**
 * Ready link: select-on-click field, copy, open in a new tab and a QR to show at the desk.
 * Registration links and employee invitations show their links with it.
 */
export function LinkUrlField({ url }: { url: string }) {
    const t = useTranslations("crm.linkUrl");
    const [showQr, setShowQr] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            toast.success(t("copied"));
        } catch {
            // clipboard is blocked (insecure origin, iframe): the field stays selectable
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                <Input
                    readOnly
                    value={url}
                    aria-label={t("copy")}
                    className="min-w-0 flex-1 cursor-text text-xs"
                    onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title={t("copy")}
                    aria-label={t("copy")}
                    onClick={copy}
                >
                    <Copy />
                </Button>
                <Button
                    type="button"
                    variant={showQr ? "secondary" : "outline"}
                    size="icon"
                    title={showQr ? t("hideQr") : t("qr")}
                    aria-label={showQr ? t("hideQr") : t("qr")}
                    aria-pressed={showQr}
                    onClick={() => setShowQr((value) => !value)}
                >
                    <QrCode />
                </Button>
                <Button
                    asChild
                    variant="outline"
                    size="icon"
                    title={t("open")}
                    aria-label={t("open")}
                >
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink />
                    </a>
                </Button>
            </div>
            {showQr && (
                <div className="flex justify-center rounded-lg border bg-white p-3">
                    <QrCodeDisplay value={url} size={176} />
                </div>
            )}
        </div>
    );
}
