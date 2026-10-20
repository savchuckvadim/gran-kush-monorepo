import { PortalTypeEnum, TaxTreatment } from "@prisma/client";

import { stripAccents } from "../text";

export type CategoryDirection = "income" | "expense";

/** Статья доходов или расходов клуба. Подпись пресета переводит CRM по `code`, своей — `name`. */
export interface FinanceCategory {
    id: string;
    code: string;
    name: string | null;
    direction: CategoryDirection;
    pgcAccount: string | null;
    taxTreatment: TaxTreatment | null;
    isPreset: boolean;
    sortOrder: number;
    archivedAt: Date | null;
}

export interface FinanceCategoryPreset {
    code: string;
    direction: CategoryDirection;
    pgcAccount: string;
    taxTreatment: TaxTreatment | null;
    sortOrder: number;
    /** Подпись по-испански — для книг и шаблона импорта, которые читает gestor */
    label: string;
}

/** Статья, в которую идут оплаченные заказы: у клуба — aportaciones по потреблению, у студии — продажи. */
export const ORDER_SALE_CATEGORY = "sales";

const preset = (
    direction: CategoryDirection,
    code: string,
    pgcAccount: string,
    label: string,
    taxTreatment: TaxTreatment | null = null
) => ({ direction, code, pgcAccount, label, taxTreatment });

/**
 * Расходы клуба и студии одни: план счетов PGC, группа 6. Страховки и банковские услуги — exentas
 * (art. 20.1.16 и 18 LIVA), зарплаты, взносы и налоги — вне IVA; остальное — по ставке поставщика.
 */
const EXPENSES = [
    preset("expense", "purchases", "600", "Compras de mercaderías"),
    preset("expense", "supplies", "602", "Material y consumibles"),
    preset("expense", "rent", "621", "Arrendamientos"),
    preset("expense", "repairs", "622", "Reparaciones y conservación"),
    preset("expense", "professional_services", "623", "Servicios de profesionales"),
    preset("expense", "insurance", "625", "Primas de seguros", TaxTreatment.exempt),
    preset("expense", "bank_fees", "626", "Servicios bancarios", TaxTreatment.exempt),
    preset("expense", "marketing", "627", "Publicidad y relaciones públicas"),
    preset("expense", "utilities", "628", "Suministros"),
    preset("expense", "taxes", "631", "Tributos", TaxTreatment.not_subject),
    preset("expense", "salaries", "640", "Sueldos y salarios", TaxTreatment.not_subject),
    preset("expense", "social_security", "642", "Seguridad Social", TaxTreatment.not_subject),
    preset("expense", "other_expenses", "629", "Otros gastos"),
];

/**
 * Asociación (PGC ESFL, RD 1491/2011): взносы за поддержание — 720 и вне IVA; aportaciones по
 * потреблению — 721, облагаются по ставке клуба (finance-requirements §1); пожертвования — 740.
 */
const CLUB_INCOME = [
    preset("income", "membership_fees", "720", "Cuotas de socios", TaxTreatment.not_subject),
    preset("income", ORDER_SALE_CATEGORY, "721", "Aportaciones por consumo"),
    preset("income", "donations", "740", "Donaciones", TaxTreatment.not_subject),
    preset("income", "other_income", "759", "Otros ingresos"),
];

/** Autónomo и SL: услуги — 705, товары — 700. */
const STUDIO_INCOME = [
    preset("income", "services", "705", "Prestación de servicios"),
    preset("income", ORDER_SALE_CATEGORY, "700", "Ventas de productos"),
    preset("income", "other_income", "759", "Otros ingresos"),
];

const withOrder = (
    list: readonly Omit<FinanceCategoryPreset, "sortOrder">[]
): FinanceCategoryPreset[] => list.map((item, index) => ({ ...item, sortOrder: (index + 1) * 10 }));

/** Пресет статей по типу портала: клуб — ассоциация, студии — autónomo. */
export const categoryPresetsFor = (type: PortalTypeEnum): FinanceCategoryPreset[] =>
    withOrder([...(type === PortalTypeEnum.CLUB ? CLUB_INCOME : STUDIO_INCOME), ...EXPENSES]);

/** Подпись статьи для документов: своё название или испанская подпись пресета. */
export const categoryLabel = (category: Pick<FinanceCategory, "code" | "name">): string =>
    category.name ??
    [...CLUB_INCOME, ...STUDIO_INCOME, ...EXPENSES].find((item) => item.code === category.code)
        ?.label ??
    category.code;

/** Код своей статьи из названия: латиница, цифры и `_`, не длиннее колонки. */
export const categoryCodeFrom = (name: string): string =>
    stripAccents(name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 32) || "category";

export const CATEGORY_ERRORS = {
    nameRequired: "category_name_required",
    codeTaken: "category_code_taken",
    receivesOrders: "category_receives_orders",
} as const;
