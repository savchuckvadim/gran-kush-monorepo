import { ExcelJsSpreadsheet } from "../spreadsheet/exceljs-spreadsheet";

describe("таблицы учёта (exceljs)", () => {
    const spreadsheet = new ExcelJsSpreadsheet();

    it("xlsx собирается и читается обратно: числа, строки, даты, пустые ячейки", async () => {
        const file = await spreadsheet.writeXlsx([
            {
                name: "movimientos",
                header: ["tipo", "base", "fecha", "notas"],
                rows: [["gasto", 1210.5, new Date(Date.UTC(2026, 9, 5)), null]],
            },
            { name: "categorias", header: ["codigo"], rows: [["rent"]] },
        ]);
        const rows = await spreadsheet.read(file);
        expect(rows?.[0]).toEqual(["tipo", "base", "fecha", "notas"]);
        expect(rows?.[1].slice(0, 3)).toEqual(["gasto", 1210.5, new Date(Date.UTC(2026, 9, 5))]);
    });

    it("csv читается по содержимому, двоичный мусор — не таблица", async () => {
        expect(await spreadsheet.read(Buffer.from("tipo;base\ngasto;10", "utf8"))).toEqual([
            ["tipo", "base"],
            ["gasto", "10"],
        ]);
        expect(await spreadsheet.read(Buffer.from([0x00, 0x01, 0x02]))).toBeNull();
        expect(await spreadsheet.read(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBeNull();
    });
});
