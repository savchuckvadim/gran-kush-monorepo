"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, FieldInput, FieldSelect } from "@workspace/ui";

import {
    FINANCE_ACCOUNTS,
    type FinanceCategory,
    type LedgerEntry,
    useFinanceCategoryLabel,
    useLedgerErrorText,
    useReclassifyLedgerEntry,
} from "@/modules/entities/finance";

interface LedgerEntryClassifyProps {
    entry: LedgerEntry;
    categories: readonly FinanceCategory[];
}

/**
 * Разметка проводки, суммы которой ведёт система: у проводки заказа — статья, счёт и заметки
 * (заплатили картой, а не наличными), у сторно — только заметки.
 */
export function LedgerEntryClassify({ entry, categories }: LedgerEntryClassifyProps) {
    const t = useTranslations("crm.finance");
    const label = useFinanceCategoryLabel();
    const errorText = useLedgerErrorText();
    const reclassify = useReclassifyLedgerEntry();
    const [categoryId, setCategoryId] = useState(entry.categoryId ?? "");
    const [account, setAccount] = useState(entry.account);
    const [notes, setNotes] = useState(entry.notes ?? "");
    const full = entry.editable === "classification";
    const changed =
        categoryId !== (entry.categoryId ?? "") ||
        account !== entry.account ||
        notes !== (entry.notes ?? "");

    const save = () =>
        reclassify.mutate(
            {
                id: entry.id,
                change: full
                    ? { categoryId: categoryId || undefined, account, notes: notes || null }
                    : { notes: notes || null },
            },
            {
                onSuccess: () => toast.success(t("entry.saved")),
                onError: (error) => toast.error(errorText(error)),
            }
        );

    return (
        <div className="space-y-3 rounded-md border p-3">
            <p className="text-xs text-muted-foreground">
                {full ? t("entry.classifyHint") : t("entry.notesHint")}
            </p>
            {full && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <FieldSelect
                        id="classify-category"
                        label={t("entry.category")}
                        value={categoryId}
                        onValueChange={setCategoryId}
                        options={categories
                            .filter(
                                (c) =>
                                    c.direction === entry.direction &&
                                    (!c.archivedAt || c.id === entry.categoryId)
                            )
                            .map((c) => ({ value: c.id, label: label(c) }))}
                    />
                    <FieldSelect
                        id="classify-account"
                        label={t("entry.account")}
                        value={account}
                        onValueChange={(next) =>
                            setAccount(FINANCE_ACCOUNTS.find((item) => item === next) ?? account)
                        }
                        options={FINANCE_ACCOUNTS.map((item) => ({
                            value: item,
                            label: t(`accounts.${item}`),
                        }))}
                    />
                </div>
            )}
            <FieldInput
                id="classify-notes"
                label={t("entry.notes")}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
            />
            <div className="flex justify-end">
                <Button size="sm" onClick={save} disabled={!changed || reclassify.isPending}>
                    {t("entry.saveClassification")}
                </Button>
            </div>
        </div>
    );
}
