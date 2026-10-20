import { Injectable } from "@nestjs/common";

import { type CellValue, Workbook } from "exceljs";

import { parseCsv } from "../../domain/import/csv";
import type { Cell } from "../../domain/import/import-values";
import {
    LedgerSpreadsheet,
    type SheetData,
} from "../../domain/repositories/ledger-spreadsheet.interface";

/** xlsx — zip-архив: файл начинается с `PK\x03\x04`. */
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const NUL = 0;
const DEFAULT_WIDTH = 14;

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null;

/** Значение ячейки exceljs → число, строка или дата; формула — её результат, ошибка — пусто. */
const toCell = (value: CellValue): Cell => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" || typeof value === "string" || value instanceof Date) {
        return value;
    }
    if (typeof value === "boolean") return String(value);
    if ("richText" in value) return value.richText.map((part) => part.text).join("");
    if ("hyperlink" in value) return value.text;
    if ("result" in value) {
        const result = value.result;
        return result === undefined || isObject(result) ? null : toCell(result);
    }
    return null;
};

@Injectable()
export class ExcelJsSpreadsheet extends LedgerSpreadsheet {
    async read(file: Buffer): Promise<Cell[][] | null> {
        if (file.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE))
            return this.readXlsx(file);
        if (file.includes(NUL)) return null;
        return parseCsv(file.toString("utf8"));
    }

    async writeXlsx(sheets: readonly SheetData[]): Promise<Buffer> {
        const workbook = new Workbook();
        for (const sheet of sheets) {
            const worksheet = workbook.addWorksheet(sheet.name, {
                views: [{ state: "frozen", ySplit: 1 }],
            });
            worksheet.columns = sheet.header.map((header, index) => ({
                header,
                width: sheet.widths?.[index] ?? DEFAULT_WIDTH,
            }));
            worksheet.getRow(1).font = { bold: true };
            for (const row of sheet.rows) worksheet.addRow([...row]);
        }
        return Buffer.from(await workbook.xlsx.writeBuffer());
    }

    private async readXlsx(file: Buffer): Promise<Cell[][] | null> {
        const workbook = new Workbook();
        // типы exceljs ждут свой Buffer (ArrayBuffer), а не Buffer Node: копия в ArrayBuffer
        const bytes = new ArrayBuffer(file.byteLength);
        new Uint8Array(bytes).set(file);
        try {
            await workbook.xlsx.load(bytes);
        } catch {
            return null;
        }
        const sheet = workbook.worksheets[0];
        if (!sheet) return null;
        const rows: Cell[][] = [];
        sheet.eachRow({ includeEmpty: true }, (row) => {
            const cells: Cell[] = [];
            for (let column = 1; column <= sheet.columnCount; column += 1) {
                cells.push(toCell(row.getCell(column).value));
            }
            rows.push(cells);
        });
        return rows;
    }
}
