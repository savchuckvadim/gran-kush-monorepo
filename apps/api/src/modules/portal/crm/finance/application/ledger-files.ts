import { toCsv } from "../domain/import/csv";
import type { SheetData } from "../domain/repositories/ledger-spreadsheet.interface";
import type { LedgerSpreadsheet } from "../domain/repositories/ledger-spreadsheet.interface";

export const LEDGER_FILE_FORMATS = ["xlsx", "csv"] as const;
export type LedgerFileFormat = (typeof LEDGER_FILE_FORMATS)[number];

const CONTENT_TYPES: Record<LedgerFileFormat, string> = {
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv; charset=utf-8",
};

/** Файл для скачивания: имя, тип и содержимое. */
export interface LedgerFile {
    fileName: string;
    contentType: string;
    body: Buffer;
}

/** xlsx — все листы; csv — только первый лист (у csv листов нет). */
export const buildLedgerFile = async (
    spreadsheet: LedgerSpreadsheet,
    sheets: readonly SheetData[],
    format: LedgerFileFormat,
    baseName: string
): Promise<LedgerFile> => {
    const body =
        format === "xlsx"
            ? await spreadsheet.writeXlsx(sheets)
            : Buffer.from(toCsv([sheets[0].header, ...sheets[0].rows]), "utf8");
    return { fileName: `${baseName}.${format}`, contentType: CONTENT_TYPES[format], body };
};
