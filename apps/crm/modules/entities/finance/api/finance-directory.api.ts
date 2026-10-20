import {
    assertOpenApiOk,
    type SchemaCounterpartyDto,
    type SchemaCounterpartyInputDto,
    type SchemaCreateFinanceCategoryDto,
    type SchemaFinanceCategoryDto,
    type SchemaFinancePeriodDto,
    type SchemaUpdateFinanceCategoryDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type FinanceCategory = SchemaFinanceCategoryDto;
export type FinanceCategoryInput = SchemaCreateFinanceCategoryDto;
export type FinanceCategoryChange = SchemaUpdateFinanceCategoryDto;
export type Counterparty = SchemaCounterpartyDto;
export type CounterpartyInput = SchemaCounterpartyInputDto;
export type CounterpartyKind = Counterparty["kind"];
export type FinancePeriod = SchemaFinancePeriodDto;

/** Статья, в которую идут оплаченные заказы: в архив её не убрать (API ответит 409). */
export const ORDER_SALE_CATEGORY = "sales";

/** Виды контрагентов, которых заводят вручную; участник клуба становится контрагентом сам. */
export const MANUAL_COUNTERPARTY_KINDS: readonly CounterpartyKind[] = [
    "supplier",
    "customer",
    "authority",
    "employee",
];

export async function getFinanceCategories(includeArchived = false): Promise<FinanceCategory[]> {
    const response = await $api.GET("/crm/finance/categories", {
        params: { query: includeArchived ? { includeArchived } : {} },
    });
    return assertOpenApiOk<FinanceCategory[]>(response);
}

export async function createFinanceCategory(body: FinanceCategoryInput): Promise<FinanceCategory> {
    const response = await $api.POST("/crm/finance/categories", { body });
    return assertOpenApiOk<FinanceCategory>(response);
}

export async function updateFinanceCategory(
    id: string,
    body: FinanceCategoryChange
): Promise<FinanceCategory> {
    const response = await $api.PATCH("/crm/finance/categories/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<FinanceCategory>(response);
}

export async function archiveFinanceCategory(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/finance/categories/{id}", {
        params: { path: { id } },
    });
    assertOpenApiOk(response);
}

export async function getCounterparties(includeArchived = false): Promise<Counterparty[]> {
    const response = await $api.GET("/crm/finance/counterparties", {
        params: { query: includeArchived ? { includeArchived } : {} },
    });
    return assertOpenApiOk<Counterparty[]>(response);
}

export async function createCounterparty(body: CounterpartyInput): Promise<Counterparty> {
    const response = await $api.POST("/crm/finance/counterparties", { body });
    return assertOpenApiOk<Counterparty>(response);
}

export async function updateCounterparty(
    id: string,
    body: CounterpartyInput
): Promise<Counterparty> {
    const response = await $api.PUT("/crm/finance/counterparties/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<Counterparty>(response);
}

export async function archiveCounterparty(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/finance/counterparties/{id}", {
        params: { path: { id } },
    });
    assertOpenApiOk(response);
}

export async function getFinancePeriods(): Promise<FinancePeriod[]> {
    const response = await $api.GET("/crm/finance/periods");
    return assertOpenApiOk<FinancePeriod[]>(response);
}

export async function closeFinancePeriod(period: { year: number; month: number }): Promise<void> {
    const response = await $api.POST("/crm/finance/periods/{year}/{month}/close", {
        params: { path: period },
    });
    assertOpenApiOk(response);
}

export async function reopenFinancePeriod(period: { year: number; month: number }): Promise<void> {
    const response = await $api.POST("/crm/finance/periods/{year}/{month}/reopen", {
        params: { path: period },
    });
    assertOpenApiOk(response);
}
