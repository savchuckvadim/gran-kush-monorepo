import { IncomeTaxRegime, LegalForm, PortalTypeEnum, VatRegime } from "@prisma/client";

/** Налоговые настройки: открыто, по ним считаются отчёты и формы. */
export interface OrganizationTaxSettings {
    legalForm: LegalForm;
    country: string;
    currency: string;
    vatRegime: VatRegime;
    incomeTaxRegime: IncomeTaxRegime;
    pricesIncludeTax: boolean;
    fiscalYearStartMonth: number;
}

/** Реквизиты организации: хранятся шифром ключа портала. */
export interface OrganizationIdentity {
    legalName: string | null;
    tradeName: string | null;
    taxId: string | null;
    addressLine: string | null;
    postalCode: string | null;
    city: string | null;
    province: string | null;
    iban: string | null;
    email: string | null;
    phone: string | null;
    gestorName: string | null;
    gestorEmail: string | null;
    gestorPhone: string | null;
}

export interface OrganizationProfile extends OrganizationTaxSettings {
    identity: OrganizationIdentity;
    updatedAt: Date;
}

export const EMPTY_IDENTITY: OrganizationIdentity = {
    legalName: null,
    tradeName: null,
    taxId: null,
    addressLine: null,
    postalCode: null,
    city: null,
    province: null,
    iban: null,
    email: null,
    phone: null,
    gestorName: null,
    gestorEmail: null,
    gestorPhone: null,
};

const clean = (value: string | null): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

/** Реквизиты без пробелов по краям; пустая строка — «не указано» (`null`). */
export const trimIdentity = (identity: OrganizationIdentity): OrganizationIdentity => ({
    legalName: clean(identity.legalName),
    tradeName: clean(identity.tradeName),
    taxId: clean(identity.taxId),
    addressLine: clean(identity.addressLine),
    postalCode: clean(identity.postalCode),
    city: clean(identity.city),
    province: clean(identity.province),
    iban: clean(identity.iban),
    email: clean(identity.email),
    phone: clean(identity.phone),
    gestorName: clean(identity.gestorName),
    gestorEmail: clean(identity.gestorEmail),
    gestorPhone: clean(identity.gestorPhone),
});

/**
 * Месяц начала финансового года. У autónomo налоговый период IRPF — календарный год
 * (art. 12 LIRPF), поэтому всегда январь; у обществ и ассоциаций период IS совпадает с их
 * ejercicio social (art. 27 LIS) и может начинаться с любого месяца.
 */
export const fiscalYearStartFor = (form: LegalForm, requested: number): number =>
    form === LegalForm.self_employed ? 1 : requested;

/** Режимы налога на прибыль, возможные для формы организации. */
export const INCOME_TAX_REGIMES_BY_FORM: Record<LegalForm, readonly IncomeTaxRegime[]> = {
    [LegalForm.association]: [
        IncomeTaxRegime.corporate_partially_exempt,
        IncomeTaxRegime.corporate,
    ],
    [LegalForm.self_employed]: [
        IncomeTaxRegime.irpf_direct_simplified,
        IncomeTaxRegime.irpf_direct_normal,
        IncomeTaxRegime.irpf_objective,
    ],
    [LegalForm.limited_company]: [IncomeTaxRegime.corporate],
    [LegalForm.other]: Object.values(IncomeTaxRegime),
};

/** Цены каталога по умолчанию — с налогом: так их показывает касса и витрина. */
export const PRICES_INCLUDE_TAX_BY_DEFAULT = true;

/** Первый режим списка — по умолчанию для формы. */
export const defaultIncomeTaxRegime = (form: LegalForm): IncomeTaxRegime =>
    INCOME_TAX_REGIMES_BY_FORM[form][0];

/**
 * Пресет по типу портала: клуб — asociación (IS частично освобождённой, взносы вне налога),
 * тату и бьюти — autónomo в estimación directa simplificada. Студия-SL выбирает форму сама.
 * Цены по умолчанию — с налогом: так их показывает касса и витрина.
 */
export const presetForPortalType = (type: PortalTypeEnum): OrganizationTaxSettings => {
    const legalForm =
        type === PortalTypeEnum.CLUB ? LegalForm.association : LegalForm.self_employed;
    return {
        legalForm,
        country: "ES",
        currency: "EUR",
        vatRegime: VatRegime.general,
        incomeTaxRegime: defaultIncomeTaxRegime(legalForm),
        pricesIncludeTax: PRICES_INCLUDE_TAX_BY_DEFAULT,
        fiscalYearStartMonth: 1,
    };
};
