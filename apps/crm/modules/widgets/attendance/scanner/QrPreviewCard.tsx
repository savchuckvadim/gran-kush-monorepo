"use client";

import { useTranslations } from "next-intl";

import { LogIn, LogOut, Loader2, User, Hash } from "lucide-react";

import { Button } from "@workspace/ui";

import type { QrPreviewResult } from "@/modules/entities/presence";

interface QrPreviewCardProps {
    preview: QrPreviewResult;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
}

/**
 * Карточка подтверждения перед записью присутствия.
 * Показывает: имя участника, текущий статус (в клубе / не в клубе),
 * предлагаемое действие (вход / выход) — и кнопки Подтвердить / Отмена.
 */
export function QrPreviewCard({ preview, onConfirm, onCancel, isLoading }: QrPreviewCardProps) {
    const t = useTranslations("crm.attendance.scanner");

    const isEntry = preview.proposedAction === "entry";
    const memberName = [preview.member?.name, preview.member?.surname]
        .filter(Boolean)
        .join(" ") || t("unknownMember");

    return (
        <div className="space-y-4">
            {/* Данные участника */}
            <div className="rounded-lg border bg-card p-4 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="font-semibold">{memberName}</p>
                        {preview.member?.membershipNumber && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Hash className="h-3 w-3" />
                                {preview.member.membershipNumber}
                            </p>
                        )}
                    </div>
                </div>

                {/* Текущий статус */}
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t("currentStatus")}</span>
                    <span
                        className={`flex items-center gap-1.5 font-medium ${
                            preview.isPresent ? "text-green-600" : "text-muted-foreground"
                        }`}
                    >
                        <span
                            className={`h-2 w-2 rounded-full ${
                                preview.isPresent ? "bg-green-500" : "bg-slate-400"
                            }`}
                        />
                        {preview.isPresent ? t("statusInClub") : t("statusNotInClub")}
                    </span>
                </div>
            </div>

            {/* Предлагаемое действие */}
            <div
                className={`flex items-center gap-3 rounded-lg border p-4 ${
                    isEntry
                        ? "border-green-500/40 bg-green-500/10"
                        : "border-blue-500/40 bg-blue-500/10"
                }`}
            >
                {isEntry ? (
                    <LogIn className="h-6 w-6 text-green-600 shrink-0" />
                ) : (
                    <LogOut className="h-6 w-6 text-blue-600 shrink-0" />
                )}
                <div>
                    <p
                        className={`font-semibold ${
                            isEntry ? "text-green-700" : "text-blue-700"
                        }`}
                    >
                        {isEntry ? t("actionEntry") : t("actionExit")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isEntry ? t("actionEntryHint") : t("actionExitHint")}
                    </p>
                </div>
            </div>

            {/* Кнопки */}
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onCancel}
                    disabled={isLoading}
                >
                    {t("cancel")}
                </Button>
                <Button
                    className={`flex-1 ${
                        isEntry
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-blue-600 hover:bg-blue-700"
                    }`}
                    onClick={onConfirm}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t("confirming")}
                        </>
                    ) : (
                        t("confirm")
                    )}
                </Button>
            </div>
        </div>
    );
}
