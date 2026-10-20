import { FinanceAccount, TaxTreatment } from "@prisma/client";

import { parseImportRow } from "../domain/import/import-row";
import { readImportSheet } from "../domain/import/import-sheet";
import type { FinanceCategory } from "../domain/ledger/finance-category";

const category = (code: string, direction: "income" | "expense"): FinanceCategory => ({
    id: `id-${code}`,
    code,
    name: null,
    direction,
    pgcAccount: null,
    taxTreatment: null,
    isPreset: true,
    sortOrder: 10,
    archivedAt: null,
});

const CATEGORIES = new Map([
    ["rent", category("rent", "expense")],
    ["professional_services", category("professional_services", "expense")],
    ["membership_fees", category("membership_fees", "income")],
]);

const RENT = {
    tipo: "gasto",
    fecha: "2026-10-01",
    categoria: "rent",
    concepto: "Alquiler del local",
    contraparte: "Inmobiliaria Sol SL",
    nif: "B12345674",
    documento: "F-118",
    base: "1000,00",
    iva_pct: "21",
    pago: "banco",
};

describe("строка импорта", () => {
    it("считает налог от базы, удержание IRPF и сверяет итог", () => {
        const { draft, issues } = parseImportRow(
            {
                ...RENT,
                categoria: "professional_services",
                base: 200,
                irpf_pct: 15,
                iva: "42",
                total: "212",
            },
            CATEGORIES
        );
        expect(issues).toEqual([]);
        expect(draft).toMatchObject({
            direction: "expense",
            occurredOn: "2026-10-01",
            account: FinanceAccount.bank,
            line: { percent: 21, treatment: TaxTreatment.taxable, net: 20000, tax: 4200 },
            withholding: { percent: 15, amount: 3000 },
            counterparty: { name: "Inmobiliaria Sol SL", nif: "B12345674", country: "ES" },
            documentNumber: "F-118",
        });
    });

    it("IVA из фактуры важнее расчёта, если расходится не больше цента", () => {
        const { draft } = parseImportRow({ ...RENT, base: "10,01", iva: "2,11" }, CATEGORIES);
        expect(draft?.line).toMatchObject({ net: 1001, tax: 211 });
        const off = parseImportRow({ ...RENT, iva: "200" }, CATEGORIES);
        expect(off.draft).toBeNull();
        expect(off.issues).toEqual([{ column: "iva", code: "tax_mismatch" }]);
    });

    it("называет колонку и причину: пусто, неверно, чужая статья, не та сторона", () => {
        const { draft, issues } = parseImportRow(
            { ...RENT, fecha: "", base: "много", categoria: "membership_fees", nif: "B1234" },
            CATEGORIES
        );
        expect(draft).toBeNull();
        expect(issues).toEqual(
            expect.arrayContaining([
                { column: "fecha", code: "required" },
                { column: "base", code: "invalid" },
                { column: "categoria", code: "category_direction" },
                { column: "nif", code: "invalid" },
            ])
        );
        const unknown = parseImportRow({ ...RENT, categoria: "yacht" }, CATEGORIES);
        expect(unknown.issues).toEqual([{ column: "categoria", code: "unknown_category" }]);
    });

    it("доход вне налога без контрагента — без удержания и без документа", () => {
        const { draft } = parseImportRow(
            {
                tipo: "ingreso",
                fecha: "10/10/2026",
                categoria: "membership_fees",
                concepto: "Cuotas",
                base: 500,
                iva_pct: "no_sujeta",
                pago: "caja",
            },
            CATEGORIES
        );
        expect(draft).toMatchObject({
            direction: "income",
            counterparty: null,
            withholding: null,
            documentNumber: null,
            line: { percent: 0, treatment: TaxTreatment.not_subject, net: 50000, tax: 0 },
        });
    });
});

describe("лист импорта", () => {
    const header = ["Tipo", "Fecha", "Categoría", "Concepto", "Base", "Pago", "Color"];

    it("находит колонки по заголовкам, пропускает пустые строки, номер строки — как в файле", () => {
        const sheet = readImportSheet(
            [
                header,
                ["gasto", "2026-10-01", "rent", "A", "1", "caja", "rojo"],
                [null, "", null],
                ["ingreso", "2026-10-02", "x", "B", "2", "banco"],
            ],
            10
        );
        expect("rows" in sheet && sheet.rows.map((row) => row.row)).toEqual([2, 4]);
        expect("rows" in sheet && sheet.rows[0].cells.categoria).toBe("rent");
    });

    it("нет обязательных колонок или строк больше потолка — отказ с причиной", () => {
        expect(readImportSheet([["Tipo", "Fecha"]], 10)).toEqual({
            problem: {
                code: "import_missing_columns",
                columns: ["categoria", "concepto", "base", "pago"],
            },
        });
        const rows = Array.from({ length: 3 }, () => [
            "gasto",
            "2026-10-01",
            "rent",
            "A",
            "1",
            "caja",
        ]);
        expect(readImportSheet([header, ...rows], 2)).toEqual({
            problem: { code: "import_too_many_rows", limit: 2 },
        });
        expect(readImportSheet([], 2)).toEqual({ problem: { code: "import_empty" } });
    });
});
