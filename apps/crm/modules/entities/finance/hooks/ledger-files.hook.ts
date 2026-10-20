"use client";

import { useMutation } from "@tanstack/react-query";

import { saveFile } from "@/modules/shared";

import {
    attachLedgerFile,
    downloadImportTemplate,
    downloadLedgerExport,
    downloadLedgerFile,
    importLedger,
    type LedgerDownload,
    removeLedgerFile,
} from "../api/ledger-files.api";

import { useLedgerMutation } from "./ledger.hook";

/** Скачать и сразу сохранить файл: шаблон, выгрузку, вложение. */
const useDownload = <A>(load: (args: A) => Promise<LedgerDownload>) =>
    useMutation({
        mutationFn: async (args: A) => {
            const file = await load(args);
            saveFile(file.blob, file.fileName);
        },
    });

export const useDownloadImportTemplate = () => useDownload(downloadImportTemplate);

export const useDownloadLedgerExport = () => useDownload(downloadLedgerExport);

export const useDownloadLedgerFile = () =>
    useDownload(({ id, name }: { id: string; name: string }) => downloadLedgerFile(id, name));

/** Проверка (`commit=false`) ничего не меняет; запись перечитывает реестр. */
export const useImportLedger = () =>
    useLedgerMutation(({ file, commit }: { file: File; commit: boolean }) =>
        importLedger(file, commit)
    );

export const useAttachLedgerFile = () =>
    useLedgerMutation(({ id, file }: { id: string; file: File }) => attachLedgerFile(id, file));

export const useRemoveLedgerFile = () => useLedgerMutation(removeLedgerFile);
