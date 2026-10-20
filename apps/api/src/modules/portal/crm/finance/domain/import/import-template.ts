import { categoryLabel, type FinanceCategory } from "../ledger/finance-category";

import { IMPORT_COLUMNS, REQUIRED_IMPORT_COLUMNS } from "./import-columns";
import type { Cell } from "./import-values";

/** Лист шаблона: заголовок и строки. */
export interface TemplateSheet {
    name: string;
    header: readonly string[];
    rows: Cell[][];
}

/** Статья примера: желаемый код, иначе первая статья нужного направления. */
const pick = (
    categories: readonly FinanceCategory[],
    direction: FinanceCategory["direction"],
    preferred: readonly string[]
): string =>
    preferred.find((code) =>
        categories.some((c) => c.code === code && c.direction === direction)
    ) ??
    categories.find((c) => c.direction === direction)?.code ??
    "";

/**
 * Шаблон импорта: три строки-примера (аренда, gestor с удержанием IRPF, доход) на статьях клуба,
 * лист статей и памятка. Номера в примерах проходят проверку — файл загружается как есть.
 */
export const importTemplate = (
    categories: readonly FinanceCategory[],
    exampleMonth: string
): TemplateSheet[] => {
    const rent = pick(categories, "expense", ["rent"]);
    const gestor = pick(categories, "expense", ["professional_services"]);
    const income = pick(categories, "income", ["membership_fees", "services"]);
    const incomeRate = income === "membership_fees" ? "no_sujeta" : 21;
    const incomeTax = income === "membership_fees" ? 0 : 105;
    const examples: Cell[][] = [
        [
            "gasto",
            `${exampleMonth}-01`,
            rent,
            "Alquiler del local",
            "Inmobiliaria Sol SL",
            "B12345674",
            "F-118",
            1000,
            21,
            210,
            "",
            1210,
            "banco",
            `${exampleMonth}-02`,
            "",
        ],
        [
            "gasto",
            `${exampleMonth}-05`,
            gestor,
            "Gestoría mensual",
            "Gestoría Martínez",
            "12345678Z",
            "2026/45",
            200,
            21,
            42,
            15,
            212,
            "banco",
            "",
            "Con retención IRPF",
        ],
        [
            "ingreso",
            `${exampleMonth}-10`,
            income,
            "Ingresos del mes",
            "",
            "",
            "",
            500,
            incomeRate,
            incomeTax,
            "",
            500 + incomeTax,
            "caja",
            "",
            "",
        ],
    ];
    const active = categories.filter((category) => category.archivedAt === null);
    return [
        { name: "movimientos", header: IMPORT_COLUMNS, rows: examples },
        {
            name: "categorias",
            header: ["codigo", "tipo", "nombre", "cuenta_pgc"],
            rows: active.map((c) => [
                c.code,
                c.direction === "income" ? "ingreso" : "gasto",
                categoryLabel(c),
                c.pgcAccount ?? "",
            ]),
        },
        {
            name: "ayuda",
            header: ["columna", "como rellenar"],
            rows: [
                ["obligatorias", REQUIRED_IMPORT_COLUMNS.join(", ")],
                ["tipo", "gasto | ingreso"],
                ["fecha, fecha_pago", "AAAA-MM-DD o DD/MM/AAAA"],
                ["categoria", "código de la hoja «categorias»"],
                ["base", "importe sin IVA: 1000,00 o 1000.00"],
                ["iva_pct", "21, 10, 4, 0, exenta o no_sujeta; vacío = 0"],
                ["iva", "vacío — se calcula; si se rellena, se comprueba"],
                ["irpf_pct", "retención del profesional, por ejemplo 15"],
                ["total", "base + iva − irpf; si se rellena, se comprueba"],
                ["pago", "caja | banco | tarjeta"],
                ["nif", "NIF, NIE o CIF; proveedor de la UE con prefijo del país (DE…)"],
            ],
        },
    ];
};
