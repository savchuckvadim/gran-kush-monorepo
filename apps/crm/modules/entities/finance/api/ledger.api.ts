import {
    assertOpenApiOk,
    type SchemaCancelledEntryDto,
    type SchemaFinanceOverviewDto,
    type SchemaLedgerEntryDto,
    type SchemaLedgerEntryInputDto,
    type SchemaPaginatedResponseLedgerEntryDto,
    type SchemaReclassifyEntryDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type LedgerEntry = SchemaLedgerEntryDto;
export type LedgerEntryInput = SchemaLedgerEntryInputDto;
export type LedgerEntryClassification = SchemaReclassifyEntryDto;
export type CancelledEntry = SchemaCancelledEntryDto;
export type LedgerPage = SchemaPaginatedResponseLedgerEntryDto;
export type FinanceOverview = SchemaFinanceOverviewDto;
export type LedgerDirection = LedgerEntry["direction"];
export type FinanceAccount = LedgerEntry["account"];
export type LedgerDocumentType = LedgerEntry["documentType"];

export const LEDGER_DIRECTIONS: readonly LedgerDirection[] = ["income", "expense", "transfer"];
export const FINANCE_ACCOUNTS: readonly FinanceAccount[] = ["cash", "bank", "card"];
export const LEDGER_DOCUMENT_TYPES: readonly LedgerDocumentType[] = [
    "none",
    "receipt",
    "invoice_received",
    "invoice_issued",
];

/** Фильтр реестра: период (даты включительно), направление, статья, счёт, контрагент. */
export interface LedgerFilter {
    from?: string;
    to?: string;
    direction?: LedgerDirection;
    categoryId?: string;
    counterpartyId?: string;
    account?: FinanceAccount;
    includeVoid?: boolean;
    page?: number;
    limit?: number;
}

/** Коды отказа API учёта (реестр, справочники, месяцы, импорт) — подсказка вместо текста API. */
export const LEDGER_ERROR_CODES = [
    "period_closed",
    "duplicate_document",
    "entry_managed_by_source",
    "entry_already_void",
    "entry_already_reversed",
    "category_required",
    "category_direction_mismatch",
    "category_archived",
    "transfer_same_account",
    "transfer_has_no_category",
    "counterparty_not_found",
    "member_not_found",
    "tax_rate_not_found",
    "attachment_type",
    "attachment_missing",
    "counterparty_name_required",
    "counterparty_nif_invalid",
    "counterparty_nif_taken",
    "counterparty_is_member",
    "category_name_required",
    "category_code_taken",
    "category_receives_orders",
    "period_not_past",
    "period_already_closed",
    "period_not_closed",
    "import_file_type",
    "import_file_missing",
    "import_empty",
    "import_missing_columns",
    "import_too_many_rows",
] as const;
export type LedgerErrorCode = (typeof LEDGER_ERROR_CODES)[number];

export const isLedgerErrorCode = (code: string | undefined): code is LedgerErrorCode =>
    code !== undefined && (LEDGER_ERROR_CODES as readonly string[]).includes(code);

export async function getLedgerEntries(filter: LedgerFilter): Promise<LedgerPage> {
    const response = await $api.GET("/crm/finance/entries", { params: { query: filter } });
    return assertOpenApiOk<LedgerPage>(response);
}

export async function getLedgerEntry(id: string): Promise<LedgerEntry> {
    const response = await $api.GET("/crm/finance/entries/{id}", { params: { path: { id } } });
    return assertOpenApiOk<LedgerEntry>(response);
}

export async function createLedgerEntry(body: LedgerEntryInput): Promise<LedgerEntry> {
    const response = await $api.POST("/crm/finance/entries", { body });
    return assertOpenApiOk<LedgerEntry>(response);
}

export async function correctLedgerEntry(id: string, body: LedgerEntryInput): Promise<LedgerEntry> {
    const response = await $api.PUT("/crm/finance/entries/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<LedgerEntry>(response);
}

export async function reclassifyLedgerEntry(
    id: string,
    body: LedgerEntryClassification
): Promise<LedgerEntry> {
    const response = await $api.PATCH("/crm/finance/entries/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<LedgerEntry>(response);
}

export async function cancelLedgerEntry(id: string): Promise<CancelledEntry> {
    const response = await $api.POST("/crm/finance/entries/{id}/cancel", {
        params: { path: { id } },
    });
    return assertOpenApiOk<CancelledEntry>(response);
}

export async function getFinanceOverview(range: {
    from: string;
    to: string;
}): Promise<FinanceOverview> {
    const response = await $api.GET("/crm/finance/overview", { params: { query: range } });
    return assertOpenApiOk<FinanceOverview>(response);
}
