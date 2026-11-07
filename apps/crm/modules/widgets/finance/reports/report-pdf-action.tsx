"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { FileDown } from "lucide-react";

import { Button } from "@workspace/ui";

import { usePermissions } from "@/modules/entities/access";
import { type QuarterRef, useStartQuarterReportPdf } from "@/modules/entities/finance";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";
import { OperationStatus } from "@/modules/widgets/operations";

import { ReportFileLink } from "./report-file-link";
import { quarterKey } from "./report-quarter";

/**
 * PDF квартала для gestor (`finance.admin`): кнопка запускает фоновую операцию, под ней — её
 * состояние и ссылка на файл, когда он готов. Другой квартал — снова кнопка.
 */
export function ReportPdfAction({ quarter }: { quarter: QuarterRef }) {
    const t = useTranslations("crm.finance.reports.pdf");
    const { can } = usePermissions();
    const start = useStartQuarterReportPdf();
    const [started, setStarted] = useState<{ key: string; operationId: string } | null>(null);
    const operationId = started?.key === quarterKey(quarter) ? started.operationId : null;
    if (!can("finance.admin")) return null;
    const run = () =>
        start.mutate(quarter, {
            onSuccess: (id) => setStarted({ key: quarterKey(quarter), operationId: id }),
            onError: (error) => notifyApiError(error, t("startError")),
        });
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Button
                variant="outline"
                size="sm"
                disabled={start.isPending}
                onClick={run}
                title={t("hint")}
            >
                <FileDown aria-hidden="true" />
                {t("start")}
            </Button>
            <OperationStatus
                operationId={operationId}
                renderResult={(result) =>
                    operationId && typeof result.fileName === "string" ? (
                        <ReportFileLink operationId={operationId} fileName={result.fileName} />
                    ) : null
                }
            />
        </div>
    );
}
