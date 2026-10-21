"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Button, ModalDialog } from "@workspace/ui";

import {
    type ImportReport,
    LEDGER_FILE_FORMATS,
    useDownloadImportTemplate,
    useImportLedger,
    useLedgerErrorText,
} from "@/modules/entities/finance";
import { FilePickButton } from "@/modules/shared/ui";

import { LedgerImportReport } from "./ledger-import-report";

const ACCEPT =
    ".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

interface LedgerImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Расходы и доходы таблицей: скачать пример, загрузить файл — сначала проверка каждой строки
 * (что запишется, дубль, ошибка с колонкой), потом запись подходящих строк.
 */
export function LedgerImportDialog({ open, onOpenChange }: LedgerImportDialogProps) {
    const t = useTranslations("crm.finance.import");
    const errorText = useLedgerErrorText();
    const template = useDownloadImportTemplate();
    const importLedger = useImportLedger();
    const [file, setFile] = useState<File | null>(null);
    const [report, setReport] = useState<ImportReport | null>(null);
    const ready = report?.rows.filter((row) => row.status === "create").length ?? 0;
    const failed = { onError: (error: unknown) => toast.error(errorText(error)) };

    /** Закрытое окно забывает файл и отчёт: следующая загрузка начинается с чистого листа */
    const close = (next: boolean) => {
        if (!next) {
            setFile(null);
            setReport(null);
        }
        onOpenChange(next);
    };

    const check = (picked: File) => {
        setFile(picked);
        setReport(null);
        importLedger.mutate({ file: picked, commit: false }, { ...failed, onSuccess: setReport });
    };

    const commit = () => {
        if (!file) return;
        importLedger.mutate(
            { file, commit: true },
            {
                ...failed,
                onSuccess: (result) => {
                    toast.success(t("done", { count: result.created }));
                    close(false);
                },
            }
        );
    };

    return (
        <ModalDialog
            scrollable
            open={open}
            onOpenChange={close}
            size="xl"
            title={t("title")}
            description={t("hint")}
            footer={
                <>
                    <Button variant="outline" onClick={() => close(false)}>
                        {t("close")}
                    </Button>
                    <Button onClick={commit} disabled={!ready || importLedger.isPending}>
                        {t("commit", { count: ready })}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t("templateLabel")}</span>
                    {LEDGER_FILE_FORMATS.map((format) => (
                        <Button
                            key={format}
                            variant="outline"
                            size="sm"
                            disabled={template.isPending}
                            onClick={() => template.mutate(format, failed)}
                        >
                            <Download aria-hidden="true" />
                            {t(`template.${format}`)}
                        </Button>
                    ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed p-4">
                    <FileSpreadsheet className="size-5 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                        {file ? file.name : t("noFile")}
                    </span>
                    <FilePickButton
                        accept={ACCEPT}
                        onPick={check}
                        disabled={importLedger.isPending}
                    >
                        {file ? t("otherFile") : t("pickFile")}
                    </FilePickButton>
                </div>
                {importLedger.isPending && (
                    <p className="text-sm text-muted-foreground">{t("checking")}</p>
                )}
                {report && <LedgerImportReport report={report} />}
            </div>
        </ModalDialog>
    );
}
