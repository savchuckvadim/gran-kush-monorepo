import { FinanceAccount, LedgerDirection, LedgerEntryStatus, TaxTreatment } from "@prisma/client";

import { LEDGER_SOURCES, type LedgerSource } from "../ledger/ledger-entry";

/**
 * Подписи выгрузок по-испански: таблицу читает gestor. Значения `tipo` и `pago` совпадают со
 * словами шаблона импорта — выгрузку можно загрузить обратно.
 */
export const DIRECTION_WORDS: Record<LedgerDirection, string> = {
    [LedgerDirection.income]: "ingreso",
    [LedgerDirection.expense]: "gasto",
    [LedgerDirection.transfer]: "traspaso",
};

export const ACCOUNT_WORDS: Record<FinanceAccount, string> = {
    [FinanceAccount.cash]: "caja",
    [FinanceAccount.bank]: "banco",
    [FinanceAccount.card]: "tarjeta",
};

/** Способ оплаты в книгах (art. 2–3 Orden HAC/773/2019 требуют указать способ). */
export const ACCOUNT_MEANS: Record<FinanceAccount, string> = {
    [FinanceAccount.cash]: "Efectivo",
    [FinanceAccount.bank]: "Transferencia",
    [FinanceAccount.card]: "Tarjeta",
};

export const STATUS_WORDS: Record<LedgerEntryStatus, string> = {
    [LedgerEntryStatus.posted]: "contabilizado",
    [LedgerEntryStatus.void]: "anulado",
};

export const SOURCE_WORDS: Record<LedgerSource, string> = {
    [LEDGER_SOURCES.manual]: "manual",
    [LEDGER_SOURCES.orderSale]: "pedido",
    [LEDGER_SOURCES.import]: "importación",
    [LEDGER_SOURCES.reversal]: "rectificación",
    [LEDGER_SOURCES.purchase]: "compra",
    [LEDGER_SOURCES.legacy]: "histórico",
};

/** Ставка в колонке `iva_pct`: процент или слово режима — как в шаблоне импорта. */
export const rateWord = (percent: number, treatment: TaxTreatment | null): string | number => {
    if (treatment === TaxTreatment.exempt) return "exenta";
    if (treatment === TaxTreatment.not_subject) return "no_sujeta";
    return percent;
};

/** Калификация операции в книгах: S — sujeta, E — exenta, N — no sujeta; без разбивки — пусто. */
export const qualificationOf = (treatment: TaxTreatment | null): string => {
    if (treatment === TaxTreatment.taxable) return "S";
    if (treatment === TaxTreatment.exempt) return "E";
    if (treatment === TaxTreatment.not_subject) return "N";
    return "";
};

export const SYSTEM_AUTHOR = "sistema";
