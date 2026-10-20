"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import {
    type LedgerEntry,
    useFinanceCategories,
    useLedgerEntries,
} from "@/modules/entities/finance";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

import { LedgerFilters, type LedgerFilterState } from "./ledger-filters";
import { LedgerPager } from "./ledger-pager";
import { LedgerRow } from "./ledger-row";
import { monthRange } from "./month-range";

const PAGE_SIZE = 25;

interface LedgerTableProps {
    filter: LedgerFilterState;
    onFilterChange: (filter: LedgerFilterState) => void;
    onOpen: (entry: LedgerEntry) => void;
    /** Вкладка «Расходы»: направление не выбирается */
    fixedDirection?: boolean;
}

/** Реестр проводок: фильтры, таблица по дате (новые сверху), листание по 25. */
export function LedgerTable({ filter, onFilterChange, onOpen, fixedDirection }: LedgerTableProps) {
    const t = useTranslations("crm.finance.ledger");
    // страница помнит, к какому фильтру относится: новый фильтр — снова первая страница
    const [paging, setPaging] = useState({ filter, page: 1 });
    const page = paging.filter === filter ? paging.page : 1;
    const { month, ...rest } = filter;
    const entries = useLedgerEntries({
        ...rest,
        ...(month ? monthRange(month) : {}),
        page,
        limit: PAGE_SIZE,
    });
    const categories = useFinanceCategories({ includeArchived: true }).data ?? [];
    const data = entries.data;

    return (
        <Card contentClassName="space-y-3 px-0">
            <div>
                <LedgerFilters
                    value={filter}
                    onChange={onFilterChange}
                    fixedDirection={fixedDirection}
                />
            </div>
            {entries.isLoading && <PageSpinner />}
            {entries.isError && <p className="text-sm text-destructive">{t("error")}</p>}
            {data && data.items.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}
            {data && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                                <th className="px-3 py-2 font-medium">{t("columns.date")}</th>
                                <th className="px-3 py-2 font-medium">{t("columns.what")}</th>
                                <th className="hidden px-3 py-2 font-medium md:table-cell">
                                    {t("columns.category")}
                                </th>
                                <th className="hidden px-3 py-2 font-medium lg:table-cell">
                                    {t("columns.account")}
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                    {t("columns.amount")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((entry) => (
                                <LedgerRow
                                    key={entry.id}
                                    entry={entry}
                                    categories={categories}
                                    onOpen={onOpen}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data && (
                <div>
                    <LedgerPager
                        page={data.page}
                        totalPages={data.totalPages}
                        total={data.total}
                        onPage={(next) => setPaging({ filter, page: next })}
                    />
                </div>
            )}
        </Card>
    );
}
