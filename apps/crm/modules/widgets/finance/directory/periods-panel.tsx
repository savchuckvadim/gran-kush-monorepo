"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Card, ConfirmDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import {
    type FinancePeriod,
    useCloseFinancePeriod,
    useFinancePeriods,
    useLedgerErrorText,
    useReopenFinancePeriod,
} from "@/modules/entities/finance";
import { CardHeading } from "@/modules/shared/ui";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { PeriodRow } from "./period-row";

type Pending = { period: FinancePeriod; action: "close" | "reopen" };

/**
 * Месяцы учёта. Закрытый месяц не меняется: правки и отмены в нём — сторно в открытом месяце.
 * Закрыть и открыть — `finance.admin`.
 */
export function PeriodsPanel({ onOpenMonth }: { onOpenMonth: (month: string) => void }) {
    const t = useTranslations("crm.finance.periods");
    const { can } = usePermissions();
    const periods = useFinancePeriods();
    const close = useCloseFinancePeriod();
    const reopen = useReopenFinancePeriod();
    const errorText = useLedgerErrorText();
    const [pending, setPending] = useState<Pending | null>(null);
    const busy = close.isPending || reopen.isPending;

    const confirm = () => {
        if (!pending) return;
        const mutation = pending.action === "close" ? close : reopen;
        mutation.mutate(
            { year: pending.period.year, month: pending.period.month },
            {
                onSuccess: () => {
                    toast.success(t(pending.action === "close" ? "closedToast" : "reopenedToast"));
                    setPending(null);
                },
                onError: (error) => toast.error(errorText(error)),
            }
        );
    };

    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t("title")} hint={t("hint")} />
            {periods.isLoading && <PageSpinner />}
            {periods.data && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <tbody>
                            {periods.data.map((period) => (
                                <PeriodRow
                                    key={`${period.year}-${period.month}`}
                                    period={period}
                                    canAdmin={can("finance.admin")}
                                    onOpenMonth={onOpenMonth}
                                    onClose={(item) =>
                                        setPending({ period: item, action: "close" })
                                    }
                                    onReopen={(item) =>
                                        setPending({ period: item, action: "reopen" })
                                    }
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => !open && setPending(null)}
                title={pending?.action === "reopen" ? t("reopenTitle") : t("closeTitle")}
                description={pending?.action === "reopen" ? t("reopenHint") : t("closeHint")}
                confirmLabel={pending?.action === "reopen" ? t("reopen") : t("close")}
                cancelLabel={t("cancel")}
                pending={busy}
                onConfirm={confirm}
            />
        </Card>
    );
}
