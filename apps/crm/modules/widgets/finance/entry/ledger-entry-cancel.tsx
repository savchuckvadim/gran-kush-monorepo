"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, ConfirmDialog } from "@workspace/ui";

import {
    type LedgerEntry,
    useCancelLedgerEntry,
    useFinancePeriods,
    useLedgerErrorText,
} from "@/modules/entities/finance";

/** Отмена ручной проводки: в открытом месяце она выходит из итогов, в закрытом — сторно сегодня. */
export function LedgerEntryCancel({
    entry,
    onDone,
}: {
    entry: LedgerEntry;
    onDone: (shownId: string) => void;
}) {
    const t = useTranslations("crm.finance.entry");
    const errorText = useLedgerErrorText();
    const cancel = useCancelLedgerEntry();
    const periods = useFinancePeriods().data ?? [];
    const [open, setOpen] = useState(false);
    const [year, month] = entry.occurredOn.split("-").map(Number);
    const closed = periods.some(
        (period) => period.year === year && period.month === month && period.closedAt
    );
    return (
        <>
            <Button variant="outline" onClick={() => setOpen(true)}>
                {t("cancelEntry")}
            </Button>
            <ConfirmDialog
                open={open}
                onOpenChange={setOpen}
                tone="destructive"
                title={t("cancelTitle")}
                description={closed ? t("cancelClosed") : t("cancelOpen")}
                confirmLabel={closed ? t("reverse") : t("cancelEntry")}
                cancelLabel={t("keep")}
                pending={cancel.isPending}
                onConfirm={() =>
                    cancel.mutate(entry.id, {
                        onSuccess: (result) => {
                            toast.success(result.mode === "reversed" ? t("reversed") : t("voided"));
                            setOpen(false);
                            onDone(result.entry.id);
                        },
                        onError: (error) => toast.error(errorText(error)),
                    })
                }
            />
        </>
    );
}
