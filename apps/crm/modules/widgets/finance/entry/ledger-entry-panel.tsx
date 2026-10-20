"use client";

import { useTranslations } from "next-intl";

import { Badge, Button, ModalDialog } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { type LedgerEntry, useFinanceCategories, useLedgerEntry } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { useEntryTitle } from "../ledger/use-entry-title";

import { LedgerEntryAttachment } from "./ledger-entry-attachment";
import { LedgerEntryCancel } from "./ledger-entry-cancel";
import { LedgerEntryClassify } from "./ledger-entry-classify";
import { LedgerEntryFacts } from "./ledger-entry-facts";
import { LedgerEntryLines } from "./ledger-entry-lines";

interface LedgerEntryPanelProps {
    entryId: string | null;
    onOpenChange: (open: boolean) => void;
    /** Показать другую проводку: сторно, отменённую */
    onShow: (id: string) => void;
    /** Правка ручной проводки целиком — форма проводки */
    onEdit: (entry: LedgerEntry) => void;
}

/** Карточка проводки: суммы по ставкам, документ, вложение, что можно сделать с ней. */
export function LedgerEntryPanel({ entryId, onOpenChange, onShow, onEdit }: LedgerEntryPanelProps) {
    const t = useTranslations("crm.finance");
    const { can } = usePermissions();
    const canWrite = can("finance.write");
    const entry = useLedgerEntry(entryId);
    const categories = useFinanceCategories({ includeArchived: true }).data ?? [];
    const title = useEntryTitle();
    const data = entry.data;
    const money = useMoneyFormat(data?.currency);
    const manual = data?.editable === "full";

    return (
        <ModalDialog
            open={entryId !== null}
            onOpenChange={onOpenChange}
            size="xl"
            title={data ? title(data) : t("entry.loading")}
            description={data ? t(`directions.${data.direction}`) : undefined}
            footer={
                <>
                    {data && canWrite && manual && (
                        <LedgerEntryCancel entry={data} onDone={onShow} />
                    )}
                    {data && canWrite && manual && (
                        <Button variant="outline" onClick={() => onEdit(data)}>
                            {t("entry.edit")}
                        </Button>
                    )}
                    <Button onClick={() => onOpenChange(false)}>{t("entry.close")}</Button>
                </>
            }
        >
            {entry.isLoading && <PageSpinner />}
            {data && (
                <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-semibold tabular-nums">
                            {money(data.totals.payable)}
                        </span>
                        {data.status === "void" && (
                            <Badge variant="secondary">{t("entry.voidBadge")}</Badge>
                        )}
                        {data.reversalOfId && (
                            <Badge variant="secondary">{t("entry.reversalBadge")}</Badge>
                        )}
                        {data.reversedById && (
                            <Badge variant="secondary">{t("entry.reversedBadge")}</Badge>
                        )}
                    </div>
                    <LedgerEntryFacts entry={data} categories={categories} onOpenEntry={onShow} />
                    {data.direction !== "transfer" && <LedgerEntryLines entry={data} />}
                    {manual && data.notes && (
                        <p className="rounded-md bg-muted px-3 py-2 text-sm">{data.notes}</p>
                    )}
                    <LedgerEntryAttachment entry={data} canWrite={canWrite} />
                    {canWrite &&
                        (data.editable === "classification" || data.editable === "notes") && (
                            <LedgerEntryClassify
                                key={data.id}
                                entry={data}
                                categories={categories}
                            />
                        )}
                </div>
            )}
        </ModalDialog>
    );
}
