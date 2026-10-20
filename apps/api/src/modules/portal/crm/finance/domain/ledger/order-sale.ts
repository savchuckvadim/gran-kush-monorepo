import {
    FinanceAccount,
    LedgerDirection,
    LedgerDocumentType,
    LedgerEntryStatus,
} from "@prisma/client";

import type { OrderSale } from "../repositories/finance-sources.interface";
import type { NewLedgerEntry } from "../repositories/ledger-repository.interface";

import { LEDGER_SOURCES, type LedgerEntry } from "./ledger-entry";

/** Оплату на стойке клуба принимают наличными; оплату картой поправят разметкой проводки. */
export const ORDER_SALE_ACCOUNT = FinanceAccount.cash;

/** Действующая продажа заказа: проведена и не сторнирована. Их у заказа не больше одной. */
export const activeSale = (entries: readonly LedgerEntry[]): LedgerEntry | null =>
    entries.find(
        (entry) =>
            entry.sourceType === LEDGER_SOURCES.orderSale &&
            entry.status === LedgerEntryStatus.posted &&
            !entry.reversedById
    ) ?? null;

const SALE_NUMBER_SEPARATOR = "#";

/** Номер следующей продажи заказа: `<orderId>#1`, после сторно и новой оплаты — `#2`. */
export const nextSaleSourceId = (orderId: string, entries: readonly LedgerEntry[]): string => {
    const sales = entries.filter((entry) => entry.sourceType === LEDGER_SOURCES.orderSale);
    return `${orderId}${SALE_NUMBER_SEPARATOR}${sales.length + 1}`;
};

/** Заказ проводки оплаты по её источнику. */
export const orderIdOfSale = (sourceId: string): string => sourceId.split(SALE_NUMBER_SEPARATOR)[0];

/** Продажа по оплаченному заказу: доход, строки налога — снимок заказа, контрагент — участник. */
export const orderSaleEntry = (
    sale: OrderSale,
    refs: { id: string; sourceId: string; categoryId: string; counterpartyId: string },
    occurredOn: string,
    currency: string
): NewLedgerEntry => ({
    id: refs.id,
    direction: LedgerDirection.income,
    occurredOn,
    categoryId: refs.categoryId,
    counterpartyId: refs.counterpartyId,
    account: ORDER_SALE_ACCOUNT,
    toAccount: null,
    currency,
    documentType: LedgerDocumentType.none,
    secret: {
        lines: sale.lines,
        withholding: null,
        description: null,
        notes: null,
        documentNumber: null,
        documentDate: null,
        paidOn: occurredOn,
        sourceLabel: sale.orderNumber,
        attachment: null,
    },
    sourceType: LEDGER_SOURCES.orderSale,
    sourceId: refs.sourceId,
    reversalOfId: null,
    createdById: null,
});
