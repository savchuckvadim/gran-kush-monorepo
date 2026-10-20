import { TaxTreatment, VatRegime } from "@prisma/client";

/** Ставка налога клуба. Подпись пресета переводит CRM по `presetCode`, у своей ставки — `name`. */
export interface TaxRate {
    id: string;
    presetCode: string | null;
    name: string | null;
    percent: number;
    treatment: TaxTreatment;
    isDefault: boolean;
    sortOrder: number;
    archivedAt: Date | null;
}

export interface TaxRatePreset {
    code: string;
    percent: number;
    treatment: TaxTreatment;
    sortOrder: number;
}

/**
 * Ставки Испании (Ley 37/1992 del IVA): general 21 %, reducido 10 %, superreducido 4 % (art. 90–91),
 * 0 % для временных мер, exenta (art. 20) и no sujeta (art. 7). IGIC Канар и IPSI Сеуты и Мелильи —
 * отдельными пресетами, когда появятся клубы оттуда.
 */
export const ES_TAX_RATE_PRESETS: readonly TaxRatePreset[] = [
    { code: "es_general", percent: 21, treatment: TaxTreatment.taxable, sortOrder: 10 },
    { code: "es_reduced", percent: 10, treatment: TaxTreatment.taxable, sortOrder: 20 },
    { code: "es_super_reduced", percent: 4, treatment: TaxTreatment.taxable, sortOrder: 30 },
    { code: "es_zero", percent: 0, treatment: TaxTreatment.taxable, sortOrder: 40 },
    { code: "es_exempt", percent: 0, treatment: TaxTreatment.exempt, sortOrder: 50 },
    { code: "es_not_subject", percent: 0, treatment: TaxTreatment.not_subject, sortOrder: 60 },
];

/** Ставка по умолчанию для режима IVA: освобождённой организации — exenta, остальным — general. */
export const defaultPresetCode = (vatRegime: VatRegime): string =>
    vatRegime === VatRegime.exempt ? "es_exempt" : "es_general";

/** У exenta и no sujeta налога нет: процент всегда 0, что бы ни прислали. */
export const percentFor = (treatment: TaxTreatment, percent: number): number =>
    treatment === TaxTreatment.taxable ? percent : 0;

/** Коды отказа 400/409 для CRM: подсветить действие, а не показывать текст API. */
export const TAX_RATE_ERRORS = {
    inUse: "tax_rate_in_use",
    isDefault: "tax_rate_is_default",
    archived: "tax_rate_archived",
    nameRequired: "tax_rate_name_required",
} as const;
