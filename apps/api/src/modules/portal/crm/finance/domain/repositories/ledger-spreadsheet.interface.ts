import type { Cell } from "../import/import-values";

/** Лист выгрузки: заголовок, строки и ширина колонок в символах. */
export interface SheetData {
    name: string;
    header: readonly string[];
    rows: readonly (readonly Cell[])[];
    widths?: readonly number[];
}

/** Таблицы учёта: прочитать загруженный файл и собрать xlsx выгрузки или шаблона. */
export abstract class LedgerSpreadsheet {
    /** Строки первого листа xlsx или строки csv (по содержимому файла); `null` — не таблица. */
    abstract read(file: Buffer): Promise<Cell[][] | null>;

    abstract writeXlsx(sheets: readonly SheetData[]): Promise<Buffer>;
}
