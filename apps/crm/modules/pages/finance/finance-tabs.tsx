"use client";

import { useTranslations } from "next-intl";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui";

import type { Counterparty, LedgerEntry } from "@/modules/entities/finance";
import {
    CounterpartiesPanel,
    FinanceOverviewPanel,
    type LedgerFilterState,
    LedgerMonthSelect,
    LedgerTable,
    monthRange,
    PeriodsPanel,
} from "@/modules/widgets/finance";
import { StockPanel } from "@/modules/widgets/stock";

export const FINANCE_TABS = [
    "overview",
    "entries",
    "expenses",
    "stock",
    "counterparties",
    "periods",
] as const;
export type FinanceTab = (typeof FINANCE_TABS)[number];

interface FinanceTabsProps {
    tab: FinanceTab;
    onTab: (tab: FinanceTab) => void;
    month: string;
    onMonth: (month: string) => void;
    entries: LedgerFilterState;
    onEntries: (filter: LedgerFilterState) => void;
    expenses: LedgerFilterState;
    onExpenses: (filter: LedgerFilterState) => void;
    onOpen: (entry: LedgerEntry) => void;
    /** Открыть проводку по id (поставка → расход в учёте) */
    onOpenEntryId: (entryId: string) => void;
}

/** Разделы учёта; переход из обзора, контрагента или месяца открывает реестр с фильтром. */
export function FinanceTabs(props: FinanceTabsProps) {
    const t = useTranslations("crm.finance.tabs");
    const { tab, onTab, month, onMonth, entries, onEntries, expenses, onExpenses, onOpen } = props;
    const { onOpenEntryId } = props;
    const showEntries = (filter: Partial<LedgerFilterState>) => {
        onEntries({ month: "", ...filter });
        onTab("entries");
    };
    return (
        <Tabs
            value={tab}
            onValueChange={(value) =>
                onTab(FINANCE_TABS.find((item) => item === value) ?? "overview")
            }
        >
            <TabsList className="max-w-full justify-start overflow-x-auto">
                {FINANCE_TABS.map((item) => (
                    <TabsTrigger key={item} value={item}>
                        {t(item)}
                    </TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="overview" className="space-y-4">
                <LedgerMonthSelect value={month} onChange={onMonth} />
                <FinanceOverviewPanel
                    range={monthRange(month)}
                    onOpenCategory={(categoryId) => showEntries({ month, categoryId })}
                />
            </TabsContent>
            <TabsContent value="entries">
                <LedgerTable filter={entries} onFilterChange={onEntries} onOpen={onOpen} />
            </TabsContent>
            <TabsContent value="expenses">
                <LedgerTable
                    filter={expenses}
                    onFilterChange={onExpenses}
                    onOpen={onOpen}
                    fixedDirection
                />
            </TabsContent>
            <TabsContent value="stock">
                <StockPanel range={monthRange(month)} onOpenEntry={onOpenEntryId} />
            </TabsContent>
            <TabsContent value="counterparties">
                <CounterpartiesPanel
                    onOpenEntries={(party: Counterparty) =>
                        showEntries({ counterpartyId: party.id })
                    }
                />
            </TabsContent>
            <TabsContent value="periods">
                <PeriodsPanel onOpenMonth={(key) => showEntries({ month: key })} />
            </TabsContent>
        </Tabs>
    );
}
