"use client";

import { useTranslations } from "next-intl";

import type { LedgerDirection } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";

import type { previewTotals } from "../model/ledger-entry-form";

interface LedgerEntryTotalsProps {
    direction: Exclude<LedgerDirection, "transfer">;
    totals: ReturnType<typeof previewTotals>;
}

/** База + налог − удержание = итог: так проводку посчитает учёт, до цента. */
export function LedgerEntryTotals({ direction, totals }: LedgerEntryTotalsProps) {
    const t = useTranslations("crm.finance.entryForm.totals");
    const money = useMoneyFormat();
    const rows = [
        { key: "net", label: t("net"), value: money(totals.net), sign: "" },
        { key: "tax", label: t("tax"), value: money(totals.tax), sign: "+" },
        ...(totals.withholding > 0
            ? [
                  {
                      key: "withholding",
                      label: t("withholding"),
                      value: money(totals.withholding),
                      sign: "−",
                  },
              ]
            : []),
    ];

    return (
        <dl className="rounded-md bg-muted px-3 py-2 text-sm tabular-nums">
            {rows.map((row) => (
                <div
                    key={row.key}
                    className="flex justify-between gap-3 py-0.5 text-muted-foreground"
                >
                    <dt>{row.label}</dt>
                    <dd>
                        {row.sign && <span className="mr-1">{row.sign}</span>}
                        {row.value}
                    </dd>
                </div>
            ))}
            <div className="mt-1 flex justify-between gap-3 border-t pt-1.5 text-base font-semibold">
                <dt>{t(`payable.${direction}`)}</dt>
                <dd>{money(totals.payable)}</dd>
            </div>
        </dl>
    );
}
