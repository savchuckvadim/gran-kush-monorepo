"use client";

import { useTranslations } from "next-intl";

import { BookOpenCheck, FileSpreadsheet, Landmark, LineChart, Wallet } from "lucide-react";
import { toast } from "sonner";

import { getApiErrorMessage } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { useSetPortalModule } from "@/modules/entities/portal-modules";

const FEATURES = [
    { id: "ledger", icon: Wallet },
    { id: "import", icon: FileSpreadsheet },
    { id: "taxes", icon: Landmark },
    { id: "reports", icon: LineChart },
] as const;

/**
 * Модуль «Финансы» не подключён: что он даёт и кнопка подключения для того, у кого settings.club.
 * Остальным — подсказка, к кому идти.
 */
export function FinanceModuleOffer() {
    const t = useTranslations("crm.finance.module");
    const { can } = usePermissions();
    const setModule = useSetPortalModule();
    const canEnable = can("settings.club");

    return (
        <Card padding="lg" className="max-w-3xl" contentClassName="space-y-6 px-0">
            <div className="flex items-start gap-3">
                <BookOpenCheck className="mt-1 size-6 shrink-0 text-primary" aria-hidden="true" />
                <div>
                    <h1 className="text-2xl font-semibold">{t("title")}</h1>
                    <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
                </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
                {FEATURES.map(({ id, icon: Icon }) => (
                    <li key={id} className="flex gap-3">
                        <Icon
                            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <div>
                            <p className="font-medium">{t(`features.${id}.title`)}</p>
                            <p className="text-sm text-muted-foreground">
                                {t(`features.${id}.text`)}
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
            {canEnable ? (
                <Button
                    disabled={setModule.isPending}
                    onClick={() =>
                        setModule.mutate(
                            { code: "finance", enabled: true },
                            {
                                onSuccess: () => toast.success(t("enabled")),
                                onError: (error) => toast.error(getApiErrorMessage(error)),
                            }
                        )
                    }
                >
                    {setModule.isPending ? t("enabling") : t("enable")}
                </Button>
            ) : (
                <p className="text-sm text-muted-foreground">{t("ownerOnly")}</p>
            )}
        </Card>
    );
}
