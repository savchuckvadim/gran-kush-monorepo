import type {
    SchemaCreateFinancialTransactionDto,
    SchemaFinancialTransactionDetailDto,
    SchemaPaginatedResponseFinancialTransactionListDto,
    SchemaTransactionGroupedByDateDto,
    SchemaTransactionGroupedByTypeDto,
    SchemaTransactionSummaryDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

// ─── Filters ─────────────────────────────────────────────────────────────────

export type TransactionType = "order_payment" | "refund" | "adjustment" | "manual";
export type TransactionDirection = "income" | "expense";

export interface TransactionsFilter {
    type?: TransactionType;
    direction?: TransactionDirection;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export interface ReportFilter {
    startDate?: string;
    endDate?: string;
}

// ─── Transactions ────────────────────────────────────────────────────────────

/**
 * Список транзакций (с пагинацией и фильтрами)
 */
export async function getTransactions(
    filters?: TransactionsFilter
): Promise<SchemaPaginatedResponseFinancialTransactionListDto> {
    const response = await $api.GET("/crm/finance/transactions", {
        params: {
            query: {
                type: filters?.type,
                direction: filters?.direction,
                startDate: filters?.startDate,
                endDate: filters?.endDate,
                page: filters?.page ?? 1,
                limit: filters?.limit ?? 20,
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.response.status}`);
    }

    return response.data as SchemaPaginatedResponseFinancialTransactionListDto;
}

/**
 * Детали транзакции
 */
export async function getTransactionById(id: string): Promise<SchemaFinancialTransactionDetailDto> {
    const response = await $api.GET("/crm/finance/transactions/{id}", {
        params: { path: { id } },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch transaction: ${response.response.status}`);
    }

    return response.data as SchemaFinancialTransactionDetailDto;
}

/**
 * Создать транзакцию
 */
export async function createTransaction(
    data: SchemaCreateFinancialTransactionDto
): Promise<SchemaFinancialTransactionDetailDto> {
    const response = await $api.POST("/crm/finance/transactions", {
        body: data,
    });

    if (!response.response.ok) {
        throw new Error(`Failed to create transaction: ${response.response.status}`);
    }

    return response.data as SchemaFinancialTransactionDetailDto;
}

// ─── Reports ─────────────────────────────────────────────────────────────────

/**
 * Сводный отчёт
 */
export async function getReportSummary(
    filters?: ReportFilter
): Promise<SchemaTransactionSummaryDto> {
    const response = await $api.GET("/crm/finance/reports/summary", {
        params: {
            query: {
                startDate: filters?.startDate ?? "",
                endDate: filters?.endDate ?? "",
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch summary: ${response.response.status}`);
    }

    return response.data as SchemaTransactionSummaryDto;
}

/**
 * Отчёт по типам
 */
export async function getReportByType(
    filters?: ReportFilter
): Promise<SchemaTransactionGroupedByTypeDto[]> {
    const response = await $api.GET("/crm/finance/reports/by-type", {
        params: {
            query: {
                startDate: filters?.startDate ?? "",
                endDate: filters?.endDate ?? "",
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch report by type: ${response.response.status}`);
    }

    return (response.data as SchemaTransactionGroupedByTypeDto[]) ?? [];
}

/**
 * Отчёт по датам
 */
export async function getReportByDate(
    filters?: ReportFilter
): Promise<SchemaTransactionGroupedByDateDto[]> {
    const response = await $api.GET("/crm/finance/reports/by-date", {
        params: {
            query: {
                startDate: filters?.startDate ?? "",
                endDate: filters?.endDate ?? "",
            },
        },
    });

    if (!response.response.ok) {
        throw new Error(`Failed to fetch report by date: ${response.response.status}`);
    }

    return (response.data as SchemaTransactionGroupedByDateDto[]) ?? [];
}
