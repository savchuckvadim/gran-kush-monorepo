import { columnOfHeader, type ImportColumn, REQUIRED_IMPORT_COLUMNS } from "./import-columns";
import { type Cell, textOf } from "./import-values";

/** Строка таблицы по колонкам шаблона; `row` — номер строки в файле (заголовок — 1). */
export interface SheetRow {
    row: number;
    cells: Partial<Record<ImportColumn, Cell>>;
}

export type SheetProblem =
    | { code: "import_empty" }
    | { code: "import_missing_columns"; columns: ImportColumn[] }
    | { code: "import_too_many_rows"; limit: number };

const HEADER_ROW = 1;

/**
 * Таблица файла → строки по колонкам шаблона. Колонки ищутся по заголовкам в любом порядке,
 * лишние колонки не мешают, пустые строки пропускаются.
 */
export const readImportSheet = (
    table: readonly (readonly Cell[])[],
    maxRows: number
): { rows: SheetRow[] } | { problem: SheetProblem } => {
    const [header, ...body] = table;
    if (!header) return { problem: { code: "import_empty" } };
    const columns = new Map<ImportColumn, number>();
    header.forEach((cell, index) => {
        const column = columnOfHeader(textOf(cell) ?? "");
        if (column && !columns.has(column)) columns.set(column, index);
    });
    const missing = REQUIRED_IMPORT_COLUMNS.filter((column) => !columns.has(column));
    if (missing.length > 0)
        return { problem: { code: "import_missing_columns", columns: missing } };
    const rows: SheetRow[] = [];
    body.forEach((values, index) => {
        const cells: Partial<Record<ImportColumn, Cell>> = {};
        for (const [column, position] of columns) cells[column] = values[position] ?? null;
        if (Object.values(cells).some((cell) => textOf(cell ?? null) !== null)) {
            rows.push({ row: index + HEADER_ROW + 1, cells });
        }
    });
    if (rows.length > maxRows) return { problem: { code: "import_too_many_rows", limit: maxRows } };
    return { rows };
};
