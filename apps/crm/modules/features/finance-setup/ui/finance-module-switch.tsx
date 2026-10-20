"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card, ConfirmDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { useSetPortalModule } from "@/modules/entities/portal-modules";

/**
 * Отключение модуля «Финансы» (право settings.club). Данные не удаляются: раздел пропадает из
 * меню, API перестаёт принимать запросы финансов, при повторном подключении всё на месте.
 */
export function FinanceModuleSwitch() {
    const t = useTranslations("crm.finance.module");
    const { can } = usePermissions();
    const setModule = useSetPortalModule();
    const [confirming, setConfirming] = useState(false);

    if (!can("settings.club")) return null;

    const disable = () =>
        setModule.mutate(
            { code: "finance", enabled: false },
            {
                onSuccess: () => {
                    setConfirming(false);
                    toast.success(t("disabled"));
                },
                onError: (error) => toast.error(getApiErrorMessage(error)),
            }
        );

    return (
        <Card padding="md" className="max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="font-semibold">{t("switchTitle")}</h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t("switchHint")}</p>
                </div>
                <Button variant="outline" onClick={() => setConfirming(true)}>
                    {t("disable")}
                </Button>
            </div>
            <ConfirmDialog
                open={confirming}
                onOpenChange={setConfirming}
                title={t("disableTitle")}
                description={t("disableDescription")}
                confirmLabel={setModule.isPending ? t("disabling") : t("disable")}
                cancelLabel={t("cancel")}
                onConfirm={disable}
                pending={setModule.isPending}
                tone="destructive"
            />
        </Card>
    );
}
