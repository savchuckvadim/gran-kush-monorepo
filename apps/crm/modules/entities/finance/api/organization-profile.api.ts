import {
    assertOpenApiOk,
    type SchemaOrganizationProfileDto,
    type SchemaUpdateOrganizationProfileDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type OrganizationProfile = SchemaOrganizationProfileDto;
export type OrganizationProfileInput = SchemaUpdateOrganizationProfileDto;
export type LegalForm = OrganizationProfile["legalForm"];
export type VatRegime = OrganizationProfile["vatRegime"];
export type IncomeTaxRegime = OrganizationProfile["incomeTaxRegime"];

/** Поля, которые API может отклонить по смыслу (контрольный знак, форма организации). */
export type OrganizationErrorField = "taxId" | "iban" | "incomeTaxRegime";

/** Коды отказа API при сохранении профиля — поле, которое надо поправить. */
export const ORGANIZATION_ERROR_FIELDS: Readonly<Record<string, OrganizationErrorField>> = {
    invalid_tax_id: "taxId",
    tax_id_kind_mismatch: "taxId",
    invalid_iban: "iban",
    tax_regime_mismatch: "incomeTaxRegime",
};

/** Режимы налога на прибыль, возможные для формы организации (как на API). */
export const INCOME_TAX_REGIMES_BY_FORM: Record<LegalForm, readonly IncomeTaxRegime[]> = {
    association: ["corporate_partially_exempt", "corporate"],
    self_employed: ["irpf_direct_simplified", "irpf_direct_normal", "irpf_objective"],
    limited_company: ["corporate"],
    other: [
        "corporate_partially_exempt",
        "corporate",
        "irpf_direct_simplified",
        "irpf_direct_normal",
        "irpf_objective",
    ],
};

export const LEGAL_FORMS: readonly LegalForm[] = [
    "association",
    "self_employed",
    "limited_company",
    "other",
];
export const VAT_REGIMES: readonly VatRegime[] = ["general", "exempt", "equivalence_surcharge"];

export async function getOrganizationProfile(): Promise<OrganizationProfile> {
    const response = await $api.GET("/crm/finance/profile");
    return assertOpenApiOk<OrganizationProfile>(response);
}

export async function saveOrganizationProfile(
    body: OrganizationProfileInput
): Promise<OrganizationProfile> {
    const response = await $api.PUT("/crm/finance/profile", { body });
    return assertOpenApiOk<OrganizationProfile>(response);
}
