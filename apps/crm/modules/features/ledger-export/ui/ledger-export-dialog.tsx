"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { toast } from "sonner";

import { Button, FieldInput, FieldSelect, ModalDialog } from "@workspace/ui";

import {
    LEDGER_EXPORT_BOOKS,
    LEDGER_FILE_FORMATS,
    type LedgerExportBook,
    type LedgerFileFormat,
    useDownloadLedgerExport,
    useLedgerErrorText,
} from "@/modules/entities/finance";

interface LedgerExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Период по умолчанию — тот, что открыт на экране */
    from: string;
    to: string;
}

/**
 * Выгрузка для gestor: проводки (их можно загрузить обратно) или книги compras y gastos и
 * ventas e ingresos за период. Каждая выгрузка попадает в журнал клуба.
 */
export function LedgerExportDialog({ open, onOpenChange, from, to }: LedgerExportDialogProps) {
    const t = useTranslations("crm.finance.export");
    const errorText = useLedgerErrorText();
    const download = useDownloadLedgerExport();
    /** Свой период, пока окно открыто; закрыли — снова период экрана */
    const [edited, setEdited] = useState<{ from: string; to: string } | null>(null);
    const [book, setBook] = useState<LedgerExportBook>("purchases");
    const [format, setFormat] = useState<LedgerFileFormat>("xlsx");
    const range = edited ?? { from, to };
    const setRange = setEdited;
    const close = (next: boolean) => {
        if (!next) setEdited(null);
        onOpenChange(next);
    };

    const submit = () =>
        download.mutate(
            { ...range, book, format },
            {
                onSuccess: () => close(false),
                onError: (error) => toast.error(errorText(error)),
            }
        );

    return (
        <ModalDialog
            open={open}
            onOpenChange={close}
            title={t("title")}
            description={t("hint")}
            footer={
                <>
                    <Button variant="outline" onClick={() => close(false)}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={submit} disabled={download.isPending || range.from > range.to}>
                        {download.isPending ? t("preparing") : t("download")}
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <FieldSelect
                    id="export-book"
                    label={t("book")}
                    helperText={t(`bookHint.${book}`)}
                    value={book}
                    onValueChange={(value) =>
                        setBook(LEDGER_EXPORT_BOOKS.find((item) => item === value) ?? book)
                    }
                    options={LEDGER_EXPORT_BOOKS.map((item) => ({
                        value: item,
                        label: t(`books.${item}`),
                    }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                    <FieldInput
                        id="export-from"
                        label={t("from")}
                        type="date"
                        value={range.from}
                        onChange={(event) => setRange({ ...range, from: event.target.value })}
                    />
                    <FieldInput
                        id="export-to"
                        label={t("to")}
                        type="date"
                        value={range.to}
                        onChange={(event) => setRange({ ...range, to: event.target.value })}
                    />
                </div>
                <FieldSelect
                    id="export-format"
                    label={t("format")}
                    value={format}
                    onValueChange={(value) =>
                        setFormat(LEDGER_FILE_FORMATS.find((item) => item === value) ?? format)
                    }
                    options={LEDGER_FILE_FORMATS.map((item) => ({
                        value: item,
                        label: t(`formats.${item}`),
                    }))}
                />
            </div>
        </ModalDialog>
    );
}
