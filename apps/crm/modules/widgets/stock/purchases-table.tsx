"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { usePurchases } from "@/modules/entities/stock";
import { useCalendarDateFormat, useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";
import { LedgerPager } from "@/modules/widgets/finance/ledger/ledger-pager";

const PAGE_SIZE = 25;

interface PurchasesTableProps {
    range?: { from: string; to: string };
    productId?: string;
    /** Открыть проводку расхода в учёте */
    onOpenEntry: (entryId: string) => void;
}

/** Поставки: товар, количество, цена закупки, сумма, поставщик; у проводки — ссылка в учёт. */
export function PurchasesTable({ range, productId, onOpenEntry }: PurchasesTableProps) {
    const t = useTranslations("crm.stock.purchases");
    const date = useCalendarDateFormat();
    const money = useMoneyFormat();
    const [page, setPage] = useState(1);
    const purchases = usePurchases({ ...range, productId, page, limit: PAGE_SIZE });
    const data = purchases.data;
    const head = (key: string, extra = "") => (
        <th className={`px-3 py-2 font-medium ${extra}`}>{t(`columns.${key}`)}</th>
    );

    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t("title")} hint={t("hint")} />
            {purchases.isLoading && <PageSpinner />}
            {data && data.items.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}
            {data && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                                {head("date")}
                                {head("product")}
                                {head("quantity", "text-right")}
                                {head("unitCost", "hidden text-right md:table-cell")}
                                {head("total", "text-right")}
                                {head("counterparty", "hidden lg:table-cell")}
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {data.items.map((purchase) => (
                                <tr
                                    key={purchase.id}
                                    className={`border-b last:border-b-0 ${purchase.ledgerEntryId ? "cursor-pointer hover:bg-muted/50" : ""}`}
                                    onClick={() =>
                                        purchase.ledgerEntryId &&
                                        onOpenEntry(purchase.ledgerEntryId)
                                    }
                                >
                                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                        {date(purchase.receivedOn)}
                                    </td>
                                    <td className="max-w-64 truncate px-3 py-2">
                                        {purchase.productName}
                                    </td>
                                    <td className="px-3 py-2 text-right">{purchase.quantity}</td>
                                    <td className="hidden px-3 py-2 text-right md:table-cell">
                                        {money(purchase.unitCost)}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {money(purchase.total)}
                                    </td>
                                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                                        {purchase.counterpartyName ?? "—"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data && (
                <LedgerPager
                    countLabel={t("total", { count: data.total })}
                    page={data.page}
                    totalPages={data.totalPages}
                    total={data.total}
                    onPage={setPage}
                />
            )}
        </Card>
    );
}
