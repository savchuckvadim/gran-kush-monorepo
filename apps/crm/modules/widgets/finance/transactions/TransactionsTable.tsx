"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import type { SchemaFinancialTransactionListDto } from "@workspace/api-client/core";
import { Button, Card } from "@workspace/ui";

import { type TransactionDirection,useTransactions } from "@/modules/entities/finance";

function TransactionRow({ tx }: { tx: SchemaFinancialTransactionListDto }) {
    const t = useTranslations("crm.finance.transactions");

    const isIncome = tx.direction === "income";

    return (
        <tr className="border-b text-sm last:border-b-0">
            <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(tx.transactionDate).toLocaleString()}
            </td>
            <td className="px-3 py-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {t(`type.${tx.type}`)}
                </span>
            </td>
            <td className="px-3 py-2">
                <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                        isIncome
                            ? "bg-green-500/10 text-green-700"
                            : "bg-red-500/10 text-red-700"
                    }`}
                >
                    {isIncome ? t("income") : t("expense")}
                </span>
            </td>
            <td className="px-3 py-2 text-right font-mono">
                <span className={isIncome ? "text-green-700" : "text-red-700"}>
                    {isIncome ? "+" : "-"}€{tx.amount}
                </span>
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
                {tx.paymentMethod ? t(`method.${tx.paymentMethod}`) : "—"}
            </td>
            <td className="px-3 py-2 text-xs text-muted-foreground">
                {tx.description ?? "—"}
            </td>
        </tr>
    );
}

export function TransactionsTable() {
    const t = useTranslations("crm.finance.transactions");
    const [page, setPage] = useState(1);
    const [directionFilter, setDirectionFilter] = useState<TransactionDirection | undefined>();

    const { data, isLoading, error } = useTransactions({
        page,
        limit: 20,
        direction: directionFilter,
    });

    const transactions = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    return (
        <Card className="p-4">
            <h2 className="mb-4 text-base font-medium">{t("title")}</h2>

            {/* Фильтры */}
            <div className="mb-4 flex gap-1">
                <Button
                    variant={!directionFilter ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDirectionFilter(undefined)}
                >
                    {t("all")}
                </Button>
                <Button
                    variant={directionFilter === "income" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDirectionFilter("income")}
                >
                    {t("income")}
                </Button>
                <Button
                    variant={directionFilter === "expense" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDirectionFilter("expense")}
                >
                    {t("expense")}
                </Button>
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 py-8 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{t("loading")}</span>
                </div>
            )}

            {error && <p className="py-4 text-sm text-destructive">{t("error")}</p>}

            {!isLoading && !error && transactions.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
            )}

            {transactions.length > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground">
                                    <th className="px-3 py-2 font-medium">{t("colDate")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colType")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colDirection")}</th>
                                    <th className="px-3 py-2 text-right font-medium">{t("colAmount")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colMethod")}</th>
                                    <th className="px-3 py-2 font-medium">{t("colDescription")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx) => (
                                    <TransactionRow key={tx.id} tx={tx} />
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                                {t("page")} {page} / {totalPages}
                            </span>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </Card>
    );
}
