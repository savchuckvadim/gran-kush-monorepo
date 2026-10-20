"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Camera, Keyboard, Loader2, XCircle } from "lucide-react";

import { Button } from "@workspace/ui";
import { cn } from "@workspace/ui/lib/utils";

import { QrCameraScannerYudiel } from "./QrCameraScannerYudiel";

type ScanTab = "camera" | "manual";

interface ScanInputStepProps {
    onRead: (code: string) => void;
    reading: boolean;
    error: string | null;
    /** Новый ключ перезапускает камеру после неудачного кода */
    cameraKey: number;
    /** Код из адреса (`/scan?code=…`): сразу во вкладке ручного ввода */
    initialCode?: string;
    /** Подсказка поля: у стойки — код участника, у общего сканера — любой код */
    manualPlaceholder?: string;
}

const TAB_CLASS =
    "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors";

/** Первый шаг стойки: камера или код вручную. */
export function ScanInputStep({
    onRead,
    reading,
    error,
    cameraKey,
    initialCode,
    manualPlaceholder,
}: ScanInputStepProps) {
    const t = useTranslations("crm.attendance.scanner");
    const [tab, setTab] = useState<ScanTab>(initialCode ? "manual" : "camera");
    const [manualCode, setManualCode] = useState(initialCode ?? "");

    const tabButton = (value: ScanTab, icon: React.ReactNode, label: string) => (
        <button
            type="button"
            onClick={() => setTab(value)}
            className={cn(
                TAB_CLASS,
                tab === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
            )}
        >
            {icon}
            {label}
        </button>
    );

    return (
        <div className="space-y-3">
            <div className="flex gap-1 rounded-lg border bg-muted p-1">
                {tabButton("camera", <Camera className="h-4 w-4" />, t("tabCamera"))}
                {tabButton("manual", <Keyboard className="h-4 w-4" />, t("tabManual"))}
            </div>

            {tab === "camera" && (
                <>
                    <QrCameraScannerYudiel key={cameraKey} onScan={onRead} />
                    {reading && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t("scanning")}
                        </div>
                    )}
                </>
            )}

            {tab === "manual" && (
                <div className="space-y-3">
                    <label className="block space-y-1.5">
                        <span className="text-sm font-medium">{t("manualInput")}</span>
                        <textarea
                            value={manualCode}
                            onChange={(event) => setManualCode(event.target.value)}
                            onKeyDown={(event) => {
                                // сканер-клавиатура заканчивает код Enter: проверить его и освободить поле под следующий
                                if (event.key !== "Enter" || event.shiftKey) return;
                                event.preventDefault();
                                if (!manualCode.trim() || reading) return;
                                onRead(manualCode);
                                setManualCode("");
                            }}
                            placeholder={manualPlaceholder ?? t("manualPlaceholder")}
                            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            disabled={reading}
                        />
                    </label>
                    <Button
                        onClick={() => onRead(manualCode)}
                        disabled={!manualCode.trim() || reading}
                        className="w-full"
                    >
                        {reading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {reading ? t("scanning") : t("submitScan")}
                    </Button>
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
                >
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}
