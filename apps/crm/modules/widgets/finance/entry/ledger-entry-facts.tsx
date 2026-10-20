"use client";

import { useTranslations } from "next-intl";

import { Button } from "@workspace/ui";

import {
    type FinanceCategory,
    type LedgerEntry,
    useFinanceCategoryLabel,
} from "@/modules/entities/finance";
import { useCalendarDateFormat, useDateTimeFormat, useOpenEntity } from "@/modules/shared";
import { Fact, FactGroup } from "@/modules/shared/ui/Fact";

interface LedgerEntryFactsProps {
    entry: LedgerEntry;
    categories: readonly FinanceCategory[];
    /** Открыть другую проводку: отменённую или её сторно */
    onOpenEntry: (id: string) => void;
}

/** Что, когда, с кем и откуда: дата, статья, счёт, контрагент, документ, источник. */
export function LedgerEntryFacts({ entry, categories, onOpenEntry }: LedgerEntryFactsProps) {
    const t = useTranslations("crm.finance");
    const date = useCalendarDateFormat();
    const dateTime = useDateTimeFormat();
    const label = useFinanceCategoryLabel();
    const openEntity = useOpenEntity();
    const category = categories.find((item) => item.id === entry.categoryId);
    const account = entry.toAccount
        ? `${t(`accounts.${entry.account}`)} → ${t(`accounts.${entry.toAccount}`)}`
        : t(`accounts.${entry.account}`);
    const document =
        entry.documentType === "none"
            ? null
            : [t(`documentTypes.${entry.documentType}`), entry.documentNumber]
                  .filter(Boolean)
                  .join(" ");
    const linked = entry.reversalOfId ?? entry.reversedById;
    return (
        <div className="grid gap-6 md:grid-cols-2">
            <FactGroup title={t("entry.what")}>
                <Fact label={t("entry.date")} value={date(entry.occurredOn)} />
                <Fact label={t("entry.category")} value={category ? label(category) : null} />
                <Fact label={t("entry.account")} value={account} />
                <Fact
                    label={t("entry.counterparty")}
                    value={
                        [entry.counterpartyName, entry.counterpartyNif]
                            .filter(Boolean)
                            .join(" · ") || null
                    }
                />
            </FactGroup>
            <FactGroup title={t("entry.document")}>
                <Fact label={t("entry.documentLabel")} value={document} />
                <Fact
                    label={t("entry.documentDate")}
                    value={entry.documentDate ? date(entry.documentDate) : null}
                />
                <Fact label={t("entry.paidOn")} value={entry.paidOn ? date(entry.paidOn) : null} />
                <Fact label={t("entry.source")} value={t(`sources.${entry.sourceType}`)} />
                <Fact label={t("entry.author")} value={entry.authorName ?? t("entry.system")} />
                <Fact label={t("entry.recordedAt")} value={dateTime(entry.createdAt)} />
            </FactGroup>
            {(entry.orderId || linked) && (
                <div className="flex flex-wrap gap-2 md:col-span-2">
                    {entry.orderId && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                entry.orderId && openEntity({ kind: "order", id: entry.orderId })
                            }
                        >
                            {t("entry.openOrder", { number: entry.sourceLabel ?? "" })}
                        </Button>
                    )}
                    {linked && (
                        <Button variant="outline" size="sm" onClick={() => onOpenEntry(linked)}>
                            {entry.reversalOfId ? t("entry.openReversed") : t("entry.openReversal")}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
