"use client";

import { useTranslations } from "next-intl";

import {  LogIn, LogOut, RotateCcw } from "lucide-react";

import type { SchemaCheckInResultDto } from "@workspace/api-client/core";
import { Button } from "@workspace/ui";

interface ScanResultCardProps {
    result: SchemaCheckInResultDto;
    onReset: () => void;
}

/**
 * Карточка результата сканирования QR-кода.
 *
 * Показывает: вход или выход, данные участника, время сессии.
 */
export function ScanResultCard({ result, onReset }: ScanResultCardProps) {
    const t = useTranslations("crm.attendance.scanner");

    const isEntry = result.action === "entry";
    const session = result.session;
    const memberName = session?.member
        ? `${session.member.name} ${session.member.surname ?? ""}`.trim()
        : t("unknownMember");

    return (
        <div className="space-y-4">
            {/* Иконка и результат */}
            <div
                className={`flex flex-col items-center gap-3 rounded-lg border p-6 ${
                    isEntry
                        ? "border-green-500/30 bg-green-500/10"
                        : "border-blue-500/30 bg-blue-500/10"
                }`}
            >
                {isEntry ? (
                    <LogIn className="h-10 w-10 text-green-600" />
                ) : (
                    <LogOut className="h-10 w-10 text-blue-600" />
                )}

                <p className={`text-lg font-semibold ${isEntry ? "text-green-700" : "text-blue-700"}`}>
                    {isEntry ? t("entryConfirmed") : t("exitConfirmed")}
                </p>

                <p className="text-sm text-muted-foreground">{result.message}</p>
            </div>

            {/* Данные участника */}
            <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{t("memberName")}</span>
                    <span className="font-medium">{memberName}</span>
                </div>

                {session?.enteredAt && (
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("enteredAt")}</span>
                        <span>{new Date(session.enteredAt).toLocaleTimeString()}</span>
                    </div>
                )}

                {session?.exitedAt && (
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("exitedAt")}</span>
                        <span>{new Date(session.exitedAt).toLocaleTimeString()}</span>
                    </div>
                )}

                {session?.durationMinutes != null && session.durationMinutes > 0 && (
                    <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{t("duration")}</span>
                        <span>{session.durationMinutes} {t("minutes")}</span>
                    </div>
                )}
            </div>

            {/* Кнопка «Сканировать ещё» */}
            <Button variant="outline" className="w-full gap-2" onClick={onReset}>
                <RotateCcw className="h-4 w-4" />
                {t("scanAnother")}
            </Button>
        </div>
    );
}
