"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Download } from "lucide-react";

import { Button } from "@workspace/ui";

import { downloadQuarterReport } from "@/modules/entities/finance";
import { saveFile } from "@/modules/shared";
import { notifyApiError } from "@/modules/shared/lib/notify-api-error";

interface ReportFileLinkProps {
    operationId: string;
    fileName: string;
}

/** Готовый PDF: скачать до срока; после — API ответит 410, и тост попросит собрать заново. */
export function ReportFileLink({ operationId, fileName }: ReportFileLinkProps) {
    const t = useTranslations("crm.finance.reports.pdf");
    const [busy, setBusy] = useState(false);
    const download = async () => {
        setBusy(true);
        try {
            const file = await downloadQuarterReport(operationId);
            saveFile(file.blob, file.fileName);
        } catch (error) {
            notifyApiError(error, t("downloadError"));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Button variant="link" size="sm" className="h-auto p-0" disabled={busy} onClick={download}>
            <Download aria-hidden="true" />
            {t("download", { fileName })}
        </Button>
    );
}
