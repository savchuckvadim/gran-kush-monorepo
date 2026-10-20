import {
    assertOpenApiOk,
    type SchemaImportReportDto,
    type SchemaLedgerExportBook,
    type SchemaLedgerFileFormat,
} from "@workspace/api-client/core";

import { $api, fileNameFromDisposition } from "@/modules/shared";

import type { LedgerEntry } from "./ledger.api";

export type ImportReport = SchemaImportReportDto;
export type LedgerFileFormat = SchemaLedgerFileFormat;
export type LedgerExportBook = SchemaLedgerExportBook;

export const LEDGER_FILE_FORMATS: readonly LedgerFileFormat[] = ["xlsx", "csv"];
export const LEDGER_EXPORT_BOOKS: readonly LedgerExportBook[] = ["entries", "purchases", "sales"];

/** Скачанный файл: содержимое и имя из ответа API. */
export interface LedgerDownload {
    blob: Blob;
    fileName: string;
}

const downloaded = async (
    response: { data?: Blob; error?: unknown; response: Response },
    fallback: string
): Promise<LedgerDownload> => {
    const blob = await assertOpenApiOk<Blob>(response);
    const disposition = response.response.headers.get("Content-Disposition");
    return { blob, fileName: fileNameFromDisposition(disposition, fallback) };
};

/** Тело multipart: openapi-fetch отправляет FormData как есть, а схема описывает поле файла строкой. */
const fileForm = (file: File): { file: string } => {
    const form = new FormData();
    form.append("file", file);
    return form as unknown as { file: string };
};

export async function downloadImportTemplate(format: LedgerFileFormat): Promise<LedgerDownload> {
    const response = await $api.GET("/crm/finance/import/template", {
        params: { query: { format } },
        parseAs: "blob",
    });
    return downloaded(response, `plantilla.${format}`);
}

export async function importLedger(file: File, commit: boolean): Promise<ImportReport> {
    const response = await $api.POST("/crm/finance/import", {
        params: { query: { commit } },
        body: fileForm(file),
    });
    return assertOpenApiOk<ImportReport>(response);
}

export async function downloadLedgerExport(query: {
    from: string;
    to: string;
    book: LedgerExportBook;
    format: LedgerFileFormat;
}): Promise<LedgerDownload> {
    const response = await $api.GET("/crm/finance/export", {
        params: { query },
        parseAs: "blob",
    });
    return downloaded(response, `${query.book}.${query.format}`);
}

export async function attachLedgerFile(id: string, file: File): Promise<LedgerEntry> {
    const response = await $api.PUT("/crm/finance/entries/{id}/attachment", {
        params: { path: { id } },
        body: fileForm(file),
    });
    return assertOpenApiOk<LedgerEntry>(response);
}

export async function downloadLedgerFile(id: string, fallback: string): Promise<LedgerDownload> {
    const response = await $api.GET("/crm/finance/entries/{id}/attachment", {
        params: { path: { id } },
        parseAs: "blob",
    });
    return downloaded(response, fallback);
}

export async function removeLedgerFile(id: string): Promise<LedgerEntry> {
    const response = await $api.DELETE("/crm/finance/entries/{id}/attachment", {
        params: { path: { id } },
    });
    return assertOpenApiOk<LedgerEntry>(response);
}
