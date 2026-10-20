"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import { useStockMoves } from "@/modules/entities/stock";
import { useDateTimeFormat, useMoneyFormat, useOpenEntity } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";
import { LedgerPager } from "@/modules/widgets/finance/ledger/ledger-pager";

const PAGE_SIZE = 25;

/** Журнал движений склада: что, когда, почему и сколько осталось. Заказ открывается в слайдере. */
export function StockMovesTable({ productId }: { productId?: string }) {
    const t = useTranslations("crm.stock.moves");
    const reasons = useTranslations("crm.stock.reasons");
    const dateTime = useDateTimeFormat();
    const money = useMoneyFormat();
    const openEntity = useOpenEntity();
    const [page, setPage] = useState(1);
    const moves = useStockMoves({ productId, page, limit: PAGE_SIZE });
    const data = moves.data;
    const head = (key: string, extra = "") => (
        <th className={`px-3 py-2 font-medium ${extra}`}>{t(`columns.${key}`)}</th>
    );

    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading title={t("title")} hint={t("hint")} />
            {moves.isLoading && <PageSpinner />}
            {data && data.items.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}
            {data && data.items.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b text-xs text-muted-foreground">
                                {head("when")}
                                {!productId && head("product")}
                                {head("reason")}
                                {head("quantity", "text-right")}
                                {head("unitCost", "hidden text-right md:table-cell")}
                                {head("balance", "text-right")}
                                {head("who", "hidden lg:table-cell")}
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {data.items.map((move) => (
                                <tr
                                    key={move.id}
                                    className={`border-b last:border-b-0 ${move.orderId ? "cursor-pointer hover:bg-muted/50" : ""}`}
                                    onClick={() =>
                                        move.orderId &&
                                        openEntity({ kind: "order", id: move.orderId })
                                    }
                                >
                                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                        {dateTime(move.occurredAt)}
                                    </td>
                                    {!productId && (
                                        <td className="max-w-56 truncate px-3 py-2">
                                            {move.productName}
                                        </td>
                                    )}
                                    <td className="px-3 py-2">
                                        <span className="block">{reasons(move.reason)}</span>
                                        {move.note && (
                                            <span className="block truncate text-xs text-muted-foreground">
                                                {move.note}
                                            </span>
                                        )}
                                    </td>
                                    <td
                                        className={`px-3 py-2 text-right ${move.quantity > 0 ? "text-emerald-700 dark:text-emerald-400" : ""}`}
                                    >
                                        {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                                    </td>
                                    <td className="hidden px-3 py-2 text-right md:table-cell">
                                        {money(move.unitCost)}
                                    </td>
                                    <td className="px-3 py-2 text-right">{move.balanceAfter}</td>
                                    <td className="hidden px-3 py-2 text-muted-foreground lg:table-cell">
                                        {move.employeeName ?? t("system")}
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
