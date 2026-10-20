"use client";

import { useTranslations } from "next-intl";

import type { ImportReport } from "@/modules/entities/finance";

import { ImportRowItem } from "./import-row-item";

type RowStatus = ImportReport["rows"][number]["status"];

/** Сводка проверки и строки: сначала ошибки и дубли, потом то, что запишется. */
export function LedgerImportReport({ report }: { report: ImportReport }) {
    const t = useTranslations("crm.finance.import");
    const count = (status: RowStatus) => report.rows.filter((row) => row.status === status).length;
    const ordered = [...report.rows].sort(
        (a, b) => Number(a.status === "create") - Number(b.status === "create")
    );
    return (
        <div className="space-y-2">
            <p className="text-sm">
                {t("summary", {
                    create: count("create"),
                    duplicate: count("duplicate"),
                    error: count("error"),
                })}
            </p>
            <ul className="max-h-80 overflow-y-auto rounded-md border px-3">
                {ordered.map((row) => (
                    <ImportRowItem key={row.row} row={row} />
                ))}
            </ul>
        </div>
    );
}
