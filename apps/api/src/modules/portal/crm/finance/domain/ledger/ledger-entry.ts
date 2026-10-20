import type {
    FinanceAccount,
    LedgerDirection,
    LedgerDocumentType,
    LedgerEntryStatus,
    TaxTreatment,
} from "@prisma/client";

/**
 * Строка налога проводки в центах. У проводки из заказа строк столько, сколько ставок в заказе,
 * у ручной — одна. `treatment: null` — без разбивки: заказ оформлен до включения финансов.
 */
export interface LedgerLine {
    percent: number;
    treatment: TaxTreatment | null;
    net: number;
    tax: number;
}

/** Удержание IRPF в центах: у расхода на профессионала, у дохода от компании-клиента. */
export interface LedgerWithholding {
    percent: number;
    amount: number;
}

export interface LedgerAttachmentMeta {
    name: string;
    mime: string;
    size: number;
}

/** Всё, что о проводке шифруется: суммы, тексты, документ. В открытых колонках этого нет. */
export interface LedgerSecret {
    lines: LedgerLine[];
    withholding: LedgerWithholding | null;
    description: string | null;
    notes: string | null;
    documentNumber: string | null;
    /** Дата документа (fecha de expedición), если не совпадает с датой операции */
    documentDate: string | null;
    /** Дата оплаты или получения денег */
    paidOn: string | null;
    /** Подпись источника для людей: номер заказа */
    sourceLabel: string | null;
    attachment: LedgerAttachmentMeta | null;
}

/** Откуда проводка; вместе с `sourceId` — ключ идемпотентности. */
export const LEDGER_SOURCES = {
    manual: "manual",
    orderSale: "order_sale",
    import: "import",
    reversal: "reversal",
    legacy: "legacy",
} as const;
export type LedgerSource = (typeof LEDGER_SOURCES)[keyof typeof LEDGER_SOURCES];

/** Проводка, как её видят сервисы: открытые поля и расшифрованная часть. Даты — `YYYY-MM-DD`. */
export interface LedgerEntry {
    id: string;
    direction: LedgerDirection;
    status: LedgerEntryStatus;
    occurredOn: string;
    categoryId: string | null;
    counterpartyId: string | null;
    account: FinanceAccount;
    toAccount: FinanceAccount | null;
    currency: string;
    documentType: LedgerDocumentType;
    sourceType: LedgerSource;
    sourceId: string | null;
    reversalOfId: string | null;
    /** Сторно, которое отменило эту проводку */
    reversedById: string | null;
    hasAttachment: boolean;
    createdById: string | null;
    createdAt: Date;
    updatedAt: Date;
    voidedAt: Date | null;
    secret: LedgerSecret;
}

/** Итоги проводки в центах: `total` — по документу, `payable` — сколько денег прошло по счёту. */
export interface LedgerTotals {
    net: number;
    tax: number;
    total: number;
    withholding: number;
    payable: number;
}

export const totalsOf = (secret: Pick<LedgerSecret, "lines" | "withholding">): LedgerTotals => {
    const net = secret.lines.reduce((sum, line) => sum + line.net, 0);
    const tax = secret.lines.reduce((sum, line) => sum + line.tax, 0);
    const withholding = secret.withholding?.amount ?? 0;
    return { net, tax, total: net + tax, withholding, payable: net + tax - withholding };
};

/** Сторно: те же строки с обратным знаком. Вложение остаётся у отменённой проводки. */
export const reversedSecret = (secret: LedgerSecret): LedgerSecret => ({
    ...secret,
    lines: secret.lines.map((line) => ({ ...line, net: -line.net, tax: -line.tax })),
    withholding: secret.withholding
        ? { ...secret.withholding, amount: -secret.withholding.amount }
        : null,
    attachment: null,
});

/** Номер документа для сравнения: `F-2026/118` и `f 2026 118` — один документ. */
export const normalizeDocumentNumber = (raw: string): string =>
    raw.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Проводки из заказа и сторно ведёт система: их меняет заказ, а не правка в учёте. */
export const isSystemEntry = (entry: Pick<LedgerEntry, "sourceType">): boolean =>
    entry.sourceType === LEDGER_SOURCES.orderSale || entry.sourceType === LEDGER_SOURCES.reversal;

/** Коды отказа для CRM: подсветить поле или действие, а не показывать текст API. */
export const LEDGER_ERRORS = {
    periodClosed: "period_closed",
    duplicateDocument: "duplicate_document",
    systemEntry: "entry_managed_by_source",
    alreadyVoid: "entry_already_void",
    alreadyReversed: "entry_already_reversed",
    categoryRequired: "category_required",
    categoryDirection: "category_direction_mismatch",
    categoryArchived: "category_archived",
    transferAccounts: "transfer_same_account",
    transferCategory: "transfer_has_no_category",
    counterpartyNotFound: "counterparty_not_found",
    memberNotFound: "member_not_found",
    taxRateNotFound: "tax_rate_not_found",
    attachmentType: "attachment_type",
    attachmentMissing: "attachment_missing",
} as const;
