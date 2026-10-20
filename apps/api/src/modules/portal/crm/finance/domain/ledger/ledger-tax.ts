import { TaxTreatment } from "@prisma/client";

import type { TaxRate } from "../tax/tax-rate";

import type { CategoryDirection, FinanceCategory } from "./finance-category";

/** Поставщик выставляет IVA по общей ставке, даже если сам клуб освобождён (exento). */
export const EXPENSE_DEFAULT_RATE = "es_general";

/**
 * Ставка проводки, когда её не выбрали: статья вне налога (взносы, зарплаты, страховки) —
 * ставка её режима; расход — общая ставка поставщика; доход — ставка клуба по умолчанию.
 */
export const defaultEntryRate = (
    direction: CategoryDirection,
    category: Pick<FinanceCategory, "taxTreatment"> | null,
    rates: readonly TaxRate[]
): TaxRate | null => {
    const active = rates.filter((rate) => !rate.archivedAt);
    const treatment = category?.taxTreatment;
    if (treatment && treatment !== TaxTreatment.taxable) {
        return active.find((rate) => rate.treatment === treatment) ?? null;
    }
    const clubDefault = active.find((rate) => rate.isDefault) ?? null;
    if (direction === "income") return clubDefault;
    return active.find((rate) => rate.presetCode === EXPENSE_DEFAULT_RATE) ?? clubDefault;
};
