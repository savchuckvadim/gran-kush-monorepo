import {
    assertOpenApiOk,
    type SchemaManualStockMoveDto,
    type SchemaMarginReportDto,
    type SchemaPaginatedResponsePurchaseDto,
    type SchemaPaginatedResponseStockMoveDto,
    type SchemaReceivedPurchaseDto,
    type SchemaReceivePurchaseDto,
    type SchemaStockStateDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type StockState = SchemaStockStateDto;
export type StockMove = SchemaPaginatedResponseStockMoveDto["items"][number];
export type StockMovePage = SchemaPaginatedResponseStockMoveDto;
export type Purchase = SchemaPaginatedResponsePurchaseDto["items"][number];
export type PurchasePage = SchemaPaginatedResponsePurchaseDto;
export type PurchaseInput = SchemaReceivePurchaseDto;
export type ReceivedPurchase = SchemaReceivedPurchaseDto;
export type ManualStockMoveInput = SchemaManualStockMoveDto;
export type ManualStockMoveReason = ManualStockMoveInput["reason"];
export type MarginReport = SchemaMarginReportDto;

export const MANUAL_STOCK_MOVE_REASONS: readonly ManualStockMoveReason[] = [
    "write_off",
    "gift",
    "recount",
];

/** Коды отказа API склада — подсказка в CRM вместо текста ошибки. */
export const STOCK_ERROR_CODES = [
    "stock_quantity_positive",
    "stock_insufficient",
    "stock_product_not_found",
    "stock_note_required",
] as const;
export type StockErrorCode = (typeof STOCK_ERROR_CODES)[number];

export const isStockErrorCode = (code: string | undefined): code is StockErrorCode =>
    code !== undefined && (STOCK_ERROR_CODES as readonly string[]).includes(code);

export interface StockMovesFilter {
    productId?: string;
    page?: number;
    limit?: number;
}

export interface PurchasesFilter {
    productId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export async function getStockState(productId: string): Promise<StockState> {
    const response = await $api.GET("/crm/stock/products/{productId}", {
        params: { path: { productId } },
    });
    return assertOpenApiOk<StockState>(response);
}

export async function getStockMoves(filter: StockMovesFilter): Promise<StockMovePage> {
    const response = await $api.GET("/crm/stock/moves", { params: { query: filter } });
    return assertOpenApiOk<StockMovePage>(response);
}

export async function getPurchases(filter: PurchasesFilter): Promise<PurchasePage> {
    const response = await $api.GET("/crm/stock/purchases", { params: { query: filter } });
    return assertOpenApiOk<PurchasePage>(response);
}

export async function receivePurchase(body: PurchaseInput): Promise<ReceivedPurchase> {
    const response = await $api.POST("/crm/stock/purchases", { body });
    return assertOpenApiOk<ReceivedPurchase>(response);
}

export async function moveStock(body: ManualStockMoveInput): Promise<StockMove> {
    const response = await $api.POST("/crm/stock/moves", { body });
    return assertOpenApiOk<StockMove>(response);
}

export async function getMarginReport(range: { from: string; to: string }): Promise<MarginReport> {
    const response = await $api.GET("/crm/finance/margin", { params: { query: range } });
    return assertOpenApiOk<MarginReport>(response);
}
