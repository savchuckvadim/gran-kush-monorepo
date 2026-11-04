import {
    assertOpenApiOk,
    type SchemaFormCellDto,
    type SchemaPaginatedResponseLedgerEntryDto,
    type SchemaPeriodReportDto,
    type SchemaTaxFormCode,
    type SchemaTaxFormDto,
    type SchemaTaxFormNotApplicable,
    type SchemaTaxFormNote,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type PeriodReport = SchemaPeriodReportDto;
export type TaxForm = SchemaTaxFormDto;
export type TaxFormCell = SchemaFormCellDto;
export type TaxFormCode = SchemaTaxFormCode;
export type TaxFormNote = SchemaTaxFormNote;
export type TaxFormNotApplicable = SchemaTaxFormNotApplicable;

export type Quarter = 1 | 2 | 3 | 4;

export interface QuarterRef {
    year: number;
    quarter: Quarter;
}

/** Ячейка формы, чьи проводки открыты; `skipped` — проводки, не попавшие в форму. */
export interface FormCellRef extends QuarterRef {
    form: TaxFormCode;
    cell: string;
}

export const SKIPPED_FORM_CELL = "skipped";

export async function getPeriodReport(range: { from: string; to: string }): Promise<PeriodReport> {
    const response = await $api.GET("/crm/finance/reports/period", { params: { query: range } });
    return assertOpenApiOk<PeriodReport>(response);
}

export async function getTaxForms(quarter: QuarterRef): Promise<TaxForm[]> {
    const response = await $api.GET("/crm/finance/reports/forms", {
        params: { query: quarter },
    });
    return assertOpenApiOk<TaxForm[]>(response);
}

export async function getFormCellEntries(
    ref: FormCellRef,
    page: { page: number; limit: number }
): Promise<SchemaPaginatedResponseLedgerEntryDto> {
    const response = await $api.GET("/crm/finance/reports/forms/{form}/cells/{cell}/entries", {
        params: {
            path: { form: ref.form, cell: ref.cell },
            query: { year: ref.year, quarter: ref.quarter, ...page },
        },
    });
    return assertOpenApiOk<SchemaPaginatedResponseLedgerEntryDto>(response);
}
