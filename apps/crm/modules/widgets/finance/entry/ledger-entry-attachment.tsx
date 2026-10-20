"use client";

import { useTranslations } from "next-intl";

import { Download, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui";

import {
    type LedgerEntry,
    useAttachLedgerFile,
    useDownloadLedgerFile,
    useLedgerErrorText,
    useRemoveLedgerFile,
} from "@/modules/entities/finance";
import { FilePickButton } from "@/modules/shared/ui";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const KILOBYTE = 1024;

/** Чек или фактура проводки: скачать; приложить, заменить или убрать — с правом записи. */
export function LedgerEntryAttachment({
    entry,
    canWrite,
}: {
    entry: LedgerEntry;
    canWrite: boolean;
}) {
    const t = useTranslations("crm.finance.entry");
    const errorText = useLedgerErrorText();
    const attach = useAttachLedgerFile();
    const remove = useRemoveLedgerFile();
    const download = useDownloadLedgerFile();
    const failed = { onError: (error: unknown) => toast.error(errorText(error)) };
    const editable = canWrite && entry.editable !== "none";
    const busy = attach.isPending || remove.isPending;
    const file = entry.attachment;
    return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
            <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
                {file ? `${file.name} · ${Math.ceil(file.size / KILOBYTE)} KB` : t("noAttachment")}
            </span>
            {file && (
                <Button
                    variant="ghost"
                    size="sm"
                    disabled={download.isPending}
                    onClick={() => download.mutate({ id: entry.id, name: file.name }, failed)}
                >
                    <Download aria-hidden="true" />
                    {t("download")}
                </Button>
            )}
            {editable && (
                <FilePickButton
                    accept={ACCEPT}
                    disabled={busy}
                    onPick={(picked) =>
                        attach.mutate(
                            { id: entry.id, file: picked },
                            { ...failed, onSuccess: () => toast.success(t("attached")) }
                        )
                    }
                >
                    {file ? t("replace") : t("attach")}
                </FilePickButton>
            )}
            {editable && file && (
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("removeAttachment")}
                    disabled={busy}
                    onClick={() => remove.mutate(entry.id, failed)}
                >
                    <Trash2 aria-hidden="true" />
                </Button>
            )}
        </div>
    );
}
