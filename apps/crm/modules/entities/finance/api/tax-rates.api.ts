import {
    assertOpenApiOk,
    type SchemaCreateTaxRateDto,
    type SchemaTaxRateDto,
    type SchemaUpdateTaxRateDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type TaxRate = SchemaTaxRateDto;
export type TaxTreatment = TaxRate["treatment"];
export type TaxRateInput = SchemaCreateTaxRateDto;
export type TaxRateChange = SchemaUpdateTaxRateDto;

export const TAX_TREATMENTS: readonly TaxTreatment[] = ["taxable", "exempt", "not_subject"];

/** Коды отказа API по ставкам — подсказка в CRM вместо текста ошибки. */
export const TAX_RATE_ERROR_CODES = [
    "tax_rate_in_use",
    "tax_rate_is_default",
    "tax_rate_archived",
    "tax_rate_name_required",
] as const;
export type TaxRateErrorCode = (typeof TAX_RATE_ERROR_CODES)[number];

export const isTaxRateErrorCode = (code: string | undefined): code is TaxRateErrorCode =>
    code !== undefined && (TAX_RATE_ERROR_CODES as readonly string[]).includes(code);

export async function getTaxRates(includeArchived = false): Promise<TaxRate[]> {
    const response = await $api.GET("/crm/finance/tax-rates", {
        params: { query: includeArchived ? { includeArchived } : {} },
    });
    return assertOpenApiOk<TaxRate[]>(response);
}

export async function createTaxRate(body: TaxRateInput): Promise<TaxRate> {
    const response = await $api.POST("/crm/finance/tax-rates", { body });
    return assertOpenApiOk<TaxRate>(response);
}

export async function updateTaxRate(id: string, body: TaxRateChange): Promise<TaxRate> {
    const response = await $api.PATCH("/crm/finance/tax-rates/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<TaxRate>(response);
}

export async function makeDefaultTaxRate(id: string): Promise<void> {
    const response = await $api.PUT("/crm/finance/tax-rates/{id}/default", {
        params: { path: { id } },
    });
    assertOpenApiOk(response);
}

export async function archiveTaxRate(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/finance/tax-rates/{id}", { params: { path: { id } } });
    assertOpenApiOk(response);
}
