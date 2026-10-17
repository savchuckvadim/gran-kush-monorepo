"use client";

import { useTranslations } from "next-intl";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Card } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { usePresenceSettings, useUpdatePresenceSettings } from "@/modules/entities/presence";

import { PresenceRulesForm } from "./presence-rules-form";

/**
 * Правила присутствия клуба: в каком часовом поясе он живёт, когда закрываются визиты, которые
 * забыли закрыть на выходе, и через сколько часов визит закрывается сам. Меняет администратор.
 */
export function PresenceSettingsPage() {
    const t = useTranslations("crm.presenceSettings");
    const { can } = usePermissions();
    const canEdit = can("settings.club");
    const settings = usePresenceSettings();
    const update = useUpdatePresenceSettings();

    if (settings.isLoading || !settings.data) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
            </div>
        );
    }

    const saved = settings.data;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{t("title")}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
            </div>

            {!canEdit && <p className="text-sm text-muted-foreground">{t("adminOnly")}</p>}
            {update.error && (
                <p role="alert" className="text-sm text-destructive">
                    {getApiErrorMessage(update.error)}
                </p>
            )}

            <Card padding="sm" className="max-w-3xl p-0">
                {/* после сохранения форма пересоздаётся из ответа сервера */}
                <PresenceRulesForm
                    key={`${saved.timezone}|${saved.autoExitTime}|${saved.maxSessionHours}`}
                    settings={saved}
                    disabled={!canEdit || update.isPending}
                    onSave={(next) =>
                        update.mutate(next, { onSuccess: () => toast.success(t("saved")) })
                    }
                />
            </Card>
        </div>
    );
}
