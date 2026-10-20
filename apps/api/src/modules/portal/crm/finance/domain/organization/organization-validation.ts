import { LegalForm } from "@prisma/client";

import { isValidIban, normalizeIban } from "./iban";
import {
    INCOME_TAX_REGIMES_BY_FORM,
    type OrganizationIdentity,
    type OrganizationTaxSettings,
    trimIdentity,
} from "./organization-profile";
import { cifEntityLetter, classifySpanishTaxId, normalizeTaxId } from "./spanish-tax-id";

/** Коды отказа 400 при сохранении профиля: CRM подсвечивает поле, а не показывает текст API. */
export const ORGANIZATION_ERRORS = {
    invalidTaxId: "invalid_tax_id",
    taxIdKindMismatch: "tax_id_kind_mismatch",
    invalidIban: "invalid_iban",
    taxRegimeMismatch: "tax_regime_mismatch",
} as const;
export type OrganizationErrorCode = (typeof ORGANIZATION_ERRORS)[keyof typeof ORGANIZATION_ERRORS];

/** Буквы CIF, ожидаемые для формы: asociación — G, SL — B, SA — A. Остальным — любой CIF. */
const CIF_LETTERS_BY_FORM: Partial<Record<LegalForm, readonly string[]>> = {
    [LegalForm.association]: ["G"],
    [LegalForm.limited_company]: ["A", "B"],
};

/**
 * Реквизиты и налоги согласованы с формой организации. Возвращает нормализованные реквизиты
 * (номера без пробелов, заглавными) или код ошибки.
 *
 * - autónomo — NIF или NIE человека; asociación и SL — CIF своей буквы; «другое» — любой номер;
 * - номер необязателен на старте, но если указан — с верным контрольным знаком;
 * - режим налога на прибыль — из возможных для формы (IRPF не бывает у ассоциации).
 */
export const validateOrganization = (
    settings: Pick<OrganizationTaxSettings, "legalForm" | "incomeTaxRegime">,
    identity: OrganizationIdentity
):
    | { ok: true; identity: OrganizationIdentity }
    | { ok: false; code: OrganizationErrorCode; field: string } => {
    if (!INCOME_TAX_REGIMES_BY_FORM[settings.legalForm].includes(settings.incomeTaxRegime)) {
        return { ok: false, code: ORGANIZATION_ERRORS.taxRegimeMismatch, field: "incomeTaxRegime" };
    }

    let taxId: string | null = null;
    if (identity.taxId?.trim()) {
        taxId = normalizeTaxId(identity.taxId);
        const kind = classifySpanishTaxId(taxId);
        if (!kind) return { ok: false, code: ORGANIZATION_ERRORS.invalidTaxId, field: "taxId" };
        const personal = kind === "nif" || kind === "nie";
        const letters = CIF_LETTERS_BY_FORM[settings.legalForm];
        const mismatch =
            settings.legalForm === LegalForm.self_employed
                ? !personal
                : letters !== undefined &&
                  (personal || !letters.includes(cifEntityLetter(taxId) ?? ""));
        if (mismatch) {
            return { ok: false, code: ORGANIZATION_ERRORS.taxIdKindMismatch, field: "taxId" };
        }
    }

    let iban: string | null = null;
    if (identity.iban?.trim()) {
        iban = normalizeIban(identity.iban);
        if (!isValidIban(iban)) {
            return { ok: false, code: ORGANIZATION_ERRORS.invalidIban, field: "iban" };
        }
    }

    return { ok: true, identity: { ...trimIdentity(identity), taxId, iban } };
};
