import { parseCsv, toCsv } from "../domain/import/csv";

const BOM = String.fromCharCode(0xfeff);
const TAB = String.fromCharCode(9);

describe("CSV учёта", () => {
    it("разделитель — по заголовку: `;` испанского Excel, `,` и таб", () => {
        expect(parseCsv("tipo;base\ngasto;1000,50\n")).toEqual([
            ["tipo", "base"],
            ["gasto", "1000,50"],
        ]);
        expect(parseCsv("tipo,base\r\ngasto,10\r\n")).toEqual([
            ["tipo", "base"],
            ["gasto", "10"],
        ]);
        expect(parseCsv(`tipo${TAB}base\ngasto${TAB}10`)).toEqual([
            ["tipo", "base"],
            ["gasto", "10"],
        ]);
    });

    it("кавычки: разделитель и перевод строки внутри поля, удвоенная кавычка, BOM", () => {
        const rows = parseCsv(
            `${BOM}concepto;notas\n"Luz; agua";"línea 1\nlínea 2"\n"Dijo ""sí""";\n`
        );
        expect(rows).toEqual([
            ["concepto", "notas"],
            ["Luz; agua", "línea 1\nlínea 2"],
            ['Dijo "sí"', ""],
        ]);
    });

    it("запись для испанского Excel: BOM, `;`, запятая в числах, CRLF — и читается обратно", () => {
        const csv = toCsv([
            ["concepto", "base", "fecha"],
            ["Luz; agua", 1210.5, new Date(Date.UTC(2026, 9, 5))],
            ['Dijo "sí"', 0, null],
        ]);
        expect(csv.startsWith(BOM)).toBe(true);
        expect(csv).toContain('"Luz; agua";1210,5;2026-10-05\r\n');
        expect(parseCsv(csv)).toEqual([
            ["concepto", "base", "fecha"],
            ["Luz; agua", "1210,5", "2026-10-05"],
            ['Dijo "sí"', "0", ""],
        ]);
    });
});
