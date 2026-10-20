"use client";

import { useTranslations } from "next-intl";

import { Card, StatTile } from "@workspace/ui";

import { useMarginReport } from "@/modules/entities/stock";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";
import { PageSpinner } from "@/modules/shared/ui/Loading/PageSpinner";

/**
 * Маржа периода: выручка без налога минус себестоимость продаж, по товарам. Самые прибыльные
 * сверху, убыточные снизу — «что ест маржу».
 */
export function MarginTable({ range }: { range: { from: string; to: string } }) {
    const t = useTranslations("crm.stock.margin");
    const money = useMoneyFormat();
    const report = useMarginReport(range);
    const data = report.data;
    const tone = (value: number | null) =>
        value === null
            ? ""
            : value < 0
              ? "text-destructive"
              : "text-emerald-700 dark:text-emerald-400";

    return (
        <div className="space-y-4">
            {report.isLoading && <PageSpinner />}
            {data && (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile
                            label={t("revenue")}
                            value={money(data.revenue)}
                            hint={t("revenueHint")}
                        />
                        <StatTile label={t("cost")} value={money(data.cost)} />
                        <StatTile
                            label={t("marginLabel")}
                            value={<span className={tone(data.margin)}>{money(data.margin)}</span>}
                            hint={
                                data.revenue > 0
                                    ? t("percent", {
                                          value:
                                              Math.round((data.margin / data.revenue) * 1000) / 10,
                                      })
                                    : undefined
                            }
                        />
                        <StatTile
                            label={t("unknown")}
                            value={money(data.revenueWithoutCost)}
                            hint={t("unknownHint")}
                        />
                    </div>
                    <Card contentClassName="space-y-3 px-0">
                        <CardHeading title={t("byProduct")} hint={t("byProductHint")} />
                        {data.byProduct.length === 0 ? (
                            <p className="py-6 text-center text-sm text-muted-foreground">
                                {t("empty")}
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b text-xs text-muted-foreground">
                                            <th className="px-3 py-2 font-medium">
                                                {t("columns.product")}
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                {t("columns.quantity")}
                                            </th>
                                            <th className="hidden px-3 py-2 text-right font-medium md:table-cell">
                                                {t("columns.revenue")}
                                            </th>
                                            <th className="hidden px-3 py-2 text-right font-medium md:table-cell">
                                                {t("columns.cost")}
                                            </th>
                                            <th className="px-3 py-2 text-right font-medium">
                                                {t("columns.margin")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="tabular-nums">
                                        {data.byProduct.map((row) => (
                                            <tr
                                                key={row.productId}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="px-3 py-2">
                                                    <span className="block truncate">
                                                        {row.productName}
                                                    </span>
                                                    <span className="block truncate text-xs text-muted-foreground">
                                                        {row.categoryName}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {row.quantity}
                                                </td>
                                                <td className="hidden px-3 py-2 text-right md:table-cell">
                                                    {money(row.revenue)}
                                                </td>
                                                <td className="hidden px-3 py-2 text-right md:table-cell">
                                                    {row.cost === null ? "—" : money(row.cost)}
                                                </td>
                                                <td
                                                    className={`px-3 py-2 text-right ${tone(row.margin)}`}
                                                >
                                                    {row.margin === null
                                                        ? t("noCost")
                                                        : `${money(row.margin)} · ${row.marginPercent} %`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
