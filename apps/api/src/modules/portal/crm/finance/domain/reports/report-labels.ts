import { FinanceAccount, TaxTreatment } from "@prisma/client";

import type { FormNotApplicable, FormNote, TaxFormCode } from "./tax-form";

/** Подписи отчёта по-испански: PDF читает gestor. Номера ячеек — как в бланках AEAT. */
export const FORM_TITLES: Record<TaxFormCode, string> = {
    es_303: "Modelo 303 — IVA, régimen general",
    es_130: "Modelo 130 — IRPF, pago fraccionado (acumulado desde el 1 de enero)",
};

export const FORM_CELL_LABELS: Record<TaxFormCode, Record<string, string>> = {
    es_303: {
        "150": "Base imponible al 0 %",
        "151": "Tipo",
        "152": "Cuota al 0 %",
        "01": "Base imponible al 4 %",
        "02": "Tipo",
        "03": "Cuota al 4 %",
        "153": "Base imponible al 5 %",
        "154": "Tipo",
        "155": "Cuota al 5 %",
        "04": "Base imponible al 10 %",
        "05": "Tipo",
        "06": "Cuota al 10 %",
        "07": "Base imponible al 21 %",
        "08": "Tipo",
        "09": "Cuota al 21 %",
        "14": "Modificación de bases",
        "15": "Modificación de cuotas",
        "27": "Total cuota devengada",
        "28": "Base soportada en operaciones interiores corrientes",
        "29": "Cuotas soportadas deducibles",
        "40": "Rectificación de deducciones: base",
        "41": "Rectificación de deducciones: cuota",
        "45": "Total a deducir",
        "46": "Resultado régimen general",
    },
    es_130: {
        "01": "Ingresos computables",
        "02": "Gastos fiscalmente deducibles",
        "03": "Rendimiento neto",
        "04": "20 % del rendimiento neto",
        "05": "Pagos fraccionados de trimestres anteriores",
        "06": "Retenciones e ingresos a cuenta",
        "07": "Resultado del pago fraccionado",
    },
};

export const FORM_REASONS: Record<FormNotApplicable, string> = {
    vat_exempt: "La organización está exenta de IVA: no presenta el modelo 303.",
    equivalence_surcharge:
        "Recargo de equivalencia: el IVA lo ingresa el proveedor; no hay 303 por esta actividad.",
    not_self_employed:
        "El modelo 130 es para autónomos en estimación directa; una asociación o sociedad tributa por IS (modelos 200/202).",
    objective_regime: "En estimación objetiva (módulos) se presenta el modelo 131.",
};

export const FORM_NOTE_LABELS: Record<FormNote, string> = {
    unclassified_lines:
        "Hay líneas sin tipo (pedidos anteriores a activar finanzas) que no entran en el modelo.",
    unmapped_rate: "Hay un tipo propio que no existe en el modelo: esos apuntes no entran.",
    prorrata_review:
        "Hay ingresos exentos: la deducción del IVA puede requerir prorrata; revísalo.",
    depreciation_missing: "Las amortizaciones no están en la contabilidad: añádelas a los gastos.",
    previous_payments_estimated:
        "Los pagos de trimestres anteriores están calculados con los apuntes; corrige la casilla 05 si presentaste otras cifras.",
};

export const ACCOUNT_LABELS: Record<FinanceAccount, string> = {
    [FinanceAccount.cash]: "Caja",
    [FinanceAccount.bank]: "Banco",
    [FinanceAccount.card]: "Tarjeta",
};

export const TREATMENT_LABELS: Record<TaxTreatment, string> = {
    [TaxTreatment.taxable]: "Sujeta",
    [TaxTreatment.exempt]: "Exenta",
    [TaxTreatment.not_subject]: "No sujeta",
};

export const REPORT_TEXT = {
    title: "Informe trimestral de contabilidad",
    subtitle: (quarter: number, year: number, from: string, to: string) =>
        `${quarter}T ${year} · del ${from} al ${to}`,
    generatedAt: (date: string) => `Generado el ${date}`,
    footer: "Cifras calculadas con los apuntes de la CRM para revisión del gestor; no es una declaración presentada.",
    noTaxId: "NIF sin indicar",
    summary: "Resultado del periodo",
    income: "Ingresos (base)",
    expense: "Gastos (base)",
    result: "Resultado",
    categories: "Ingresos y gastos por categoría",
    category: "Categoría",
    uncategorized: "Sin categoría",
    vatOutput: "IVA repercutido",
    vatInput: "IVA soportado",
    rate: "Tipo",
    base: "Base",
    tax: "Cuota",
    total: "Total",
    noRate: "Sin tipo",
    withholdings: "Retenciones IRPF",
    received: "Nos retuvieron los clientes",
    applied: "Retuvimos a profesionales (modelo 111)",
    accounts: "Caja y banco",
    account: "Cuenta",
    opening: "Saldo inicial",
    inflow: "Entradas",
    outflow: "Salidas",
    closing: "Saldo final",
    cell: "Casilla",
    concept: "Concepto",
    amount: "Importe",
    documents: "Documentos",
} as const;
