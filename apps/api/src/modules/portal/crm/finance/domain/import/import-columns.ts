import { stripAccents } from "../text";

/**
 * Колонки шаблона импорта (finance-requirements §5): коды по-испански — таблицу заполняет и
 * читает gestor. Порядок — как в шаблоне и выгрузке.
 */
export const IMPORT_COLUMNS = [
    "tipo",
    "fecha",
    "categoria",
    "concepto",
    "contraparte",
    "nif",
    "documento",
    "base",
    "iva_pct",
    "iva",
    "irpf_pct",
    "total",
    "pago",
    "fecha_pago",
    "notas",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const REQUIRED_IMPORT_COLUMNS: readonly ImportColumn[] = [
    "tipo",
    "fecha",
    "categoria",
    "concepto",
    "base",
    "pago",
];

/** Как колонки называют в выгрузках банков, Holded и Quipu. */
const HEADER_ALIASES: Readonly<Record<string, ImportColumn>> = {
    tipo_movimiento: "tipo",
    fecha_operacion: "fecha",
    categoria_gasto: "categoria",
    descripcion: "concepto",
    proveedor: "contraparte",
    cliente: "contraparte",
    nombre: "contraparte",
    cif: "nif",
    nif_cif: "nif",
    factura: "documento",
    numero_factura: "documento",
    n_factura: "documento",
    base_imponible: "base",
    importe: "base",
    tipo_iva: "iva_pct",
    cuota_iva: "iva",
    retencion_pct: "irpf_pct",
    tipo_irpf: "irpf_pct",
    total_factura: "total",
    forma_pago: "pago",
    metodo_pago: "pago",
    cuenta: "pago",
    observaciones: "notas",
};

const COLUMN_SET: ReadonlySet<string> = new Set(IMPORT_COLUMNS);

const isImportColumn = (value: string): value is ImportColumn => COLUMN_SET.has(value);

/** Заголовок → колонка: регистр, пробелы и диакритика не важны, «IVA %» — это `iva_pct`. */
export const columnOfHeader = (header: string): ImportColumn | null => {
    const key = stripAccents(header)
        .toLowerCase()
        .replace(/%/g, " pct ")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (isImportColumn(key)) return key;
    return HEADER_ALIASES[key] ?? null;
};
