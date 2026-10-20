"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Wallet } from "lucide-react";

import type { LedgerDirection, LedgerEntry, OrganizationProfile } from "@/modules/entities/finance";
import { LedgerEntryDialog } from "@/modules/features/ledger-entry-form";
import { LedgerExportDialog } from "@/modules/features/ledger-export";
import { LedgerImportDialog } from "@/modules/features/ledger-import";
import {
    currentMonth,
    LedgerEntryPanel,
    type LedgerFilterState,
    monthRange,
} from "@/modules/widgets/finance";

import { FinanceHeaderActions } from "./finance-header-actions";
import { type FinanceTab, FinanceTabs } from "./finance-tabs";

type EntryForm = { direction: LedgerDirection; entry?: LedgerEntry };

/**
 * Учёт клуба: обзор месяца, реестр проводок, расходы, контрагенты и месяцы; быстрые действия
 * «Доход» и «Расход», загрузка таблицей и выгрузка для gestor. Проводка открывается карточкой.
 */
export function FinanceDashboard({ profile }: { profile: OrganizationProfile }) {
    const t = useTranslations("crm.finance");
    const [tab, setTab] = useState<FinanceTab>("overview");
    const [month, setMonth] = useState(currentMonth);
    const [entries, setEntries] = useState<LedgerFilterState>({ month: currentMonth() });
    const [expenses, setExpenses] = useState<LedgerFilterState>({
        month: currentMonth(),
        direction: "expense",
    });
    const [openEntryId, setOpenEntryId] = useState<string | null>(null);
    const [form, setForm] = useState<EntryForm | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const organization = [
        profile.tradeName ?? profile.legalName,
        t(`profile.legalForm.options.${profile.legalForm}`),
        t(`profile.vat.options.${profile.vatRegime}`),
    ].filter(Boolean);
    const range = monthRange(month);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold">
                        <Wallet className="size-6" aria-hidden="true" />
                        {t("title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{organization.join(" · ")}</p>
                </div>
                <FinanceHeaderActions
                    onNew={(direction) => setForm({ direction })}
                    onImport={() => setImportOpen(true)}
                    onExport={() => setExportOpen(true)}
                />
            </div>

            <FinanceTabs
                tab={tab}
                onTab={setTab}
                month={month}
                onMonth={setMonth}
                entries={entries}
                onEntries={setEntries}
                expenses={expenses}
                onExpenses={setExpenses}
                onOpen={(entry) => setOpenEntryId(entry.id)}
            />

            <LedgerEntryPanel
                entryId={openEntryId}
                onOpenChange={(open) => !open && setOpenEntryId(null)}
                onShow={setOpenEntryId}
                onEdit={(entry) => {
                    setOpenEntryId(null);
                    setForm({ direction: entry.direction, entry });
                }}
            />
            <LedgerEntryDialog
                open={form !== null}
                onOpenChange={(open) => !open && setForm(null)}
                direction={form?.direction}
                entry={form?.entry}
                onSaved={(saved) => setOpenEntryId(saved.id)}
            />
            <LedgerImportDialog open={importOpen} onOpenChange={setImportOpen} />
            <LedgerExportDialog
                open={exportOpen}
                onOpenChange={setExportOpen}
                from={range.from}
                to={range.to}
            />
        </div>
    );
}
