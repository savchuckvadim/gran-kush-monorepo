"use client";

import { useTranslations } from "next-intl";

import { Card } from "@workspace/ui";

import type { PeriodReport } from "@/modules/entities/finance";
import { useMoneyFormat } from "@/modules/shared";
import { CardHeading } from "@/modules/shared/ui";

import { VatRowsTable } from "./vat-rows-table";

/** IVA периода: начисленный с продаж и уплаченный в покупках по ставкам, разница. */
export function VatCard({ report }: { report: PeriodReport }) {
    const t = useTranslations("crm.finance.reports.vat");
    const money = useMoneyFormat();
    return (
        <Card contentClassName="space-y-3 px-0">
            <CardHeading
                title={t("title")}
                hint={t("hint", { balance: money(report.vat.balance) })}
            />
            <VatRowsTable
                title={t("output")}
                rows={report.vat.output}
                total={report.vat.outputTax}
            />
            <VatRowsTable title={t("input")} rows={report.vat.input} total={report.vat.inputTax} />
        </Card>
    );
}
