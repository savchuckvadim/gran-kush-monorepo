"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@workspace/ui";

import type { ImportReport } from "@/modules/entities/finance";
import { useCalendarDateFormat, useMoneyFormat } from "@/modules/shared";

type ImportRow = ImportReport["rows"][number];

const TONE = { create: "default", duplicate: "secondary", error: "destructive" } as const;

/** Строка отчёта импорта: что запишется или почему нет — с колонкой таблицы. */
export function ImportRowItem({ row }: { row: ImportRow }) {
    const t = useTranslations("crm.finance.import");
    const money = useMoneyFormat();
    const date = useCalendarDateFormat();
    const preview = row.preview;
    return (
        <li className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b py-2 text-sm last:border-b-0">
            <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums">
                {t("row", { row: row.row })}
            </span>
            <Badge variant={TONE[row.status]}>{t(`status.${row.status}`)}</Badge>
            <div className="min-w-0 flex-1">
                {preview && (
                    <p className="truncate">
                        {date(preview.occurredOn)} · {preview.description}
                        {preview.counterparty ? ` · ${preview.counterparty}` : ""}
                    </p>
                )}
                {row.issues.map((issue) => (
                    <p
                        key={`${issue.column}-${issue.code}`}
                        className="text-xs text-muted-foreground"
                    >
                        {issue.column && (
                            <code className="mr-1 rounded bg-muted px-1">{issue.column}</code>
                        )}
                        {t(`issues.${issue.code}`)}
                    </p>
                ))}
            </div>
            {preview && (
                <span className="shrink-0 tabular-nums">
                    {preview.direction === "expense" ? "−" : "+"}
                    {money(preview.total)}
                </span>
            )}
        </li>
    );
}
