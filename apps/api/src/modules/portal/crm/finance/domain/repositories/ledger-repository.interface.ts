import type { FinanceAccount, LedgerDirection, LedgerDocumentType } from "@prisma/client";

import type { EventsOf, NewDomainEvent, OutboxTransaction } from "@modules/events";

import {
    type LedgerEntry,
    type LedgerSecret,
    type LedgerSource,
    normalizeDocumentNumber,
} from "../ledger/ledger-entry";

/** Новая проводка. `id` выдаёт сервис: по нему строятся события той же транзакции. */
export interface NewLedgerEntry {
    id: string;
    direction: LedgerDirection;
    occurredOn: string;
    categoryId: string | null;
    counterpartyId: string | null;
    account: FinanceAccount;
    toAccount: FinanceAccount | null;
    currency: string;
    documentType: LedgerDocumentType;
    secret: LedgerSecret;
    sourceType: LedgerSource;
    sourceId: string | null;
    reversalOfId: string | null;
    createdById: string | null;
}

export type LedgerEntryChange = Partial<
    Pick<
        NewLedgerEntry,
        | "occurredOn"
        | "categoryId"
        | "counterpartyId"
        | "account"
        | "toAccount"
        | "documentType"
        | "secret"
    >
> & { attachmentPath?: string | null };

/** Фильтр по открытым колонкам; даты — включительно. */
export interface LedgerFilter {
    from?: string;
    to?: string;
    direction?: LedgerDirection;
    categoryId?: string;
    counterpartyId?: string;
    account?: FinanceAccount;
    includeVoid: boolean;
}

/** Что дописать по итогам сверки: проводки и их события. */
export interface LedgerWrite {
    entries: NewLedgerEntry[];
    events: NewDomainEvent[];
}

/** Документ проводки для поиска дублей: тот же контрагент, номер и дата. */
export interface DocumentKey {
    counterpartyId: string;
    documentNumber: string;
    occurredOn: string;
}

/**
 * Реестр проводок. Суммы, тексты и номер документа хранятся шифром ключа портала — репозиторий
 * шифрует при записи и расшифровывает при чтении; сервисы видят только открытые проводки.
 * Каждая запись идёт одной транзакцией с событиями и проверкой, что месяцы проводок открыты (под
 * блокировкой месяца: закрытие не проскочит между проверкой и записью); закрытый месяц —
 * `ClosedPeriodError`.
 */
export abstract class LedgerRepository {
    abstract findById(portalId: string, id: string): Promise<LedgerEntry | null>;

    /** Проводка вместе с путём вложения в хранилище — для выдачи файла. */
    abstract attachmentPathOf(portalId: string, id: string): Promise<string | null>;

    abstract list(
        portalId: string,
        filter: LedgerFilter,
        page: { skip: number; take: number }
    ): Promise<{ items: LedgerEntry[]; total: number }>;

    /** Все проводки по фильтру — для обзора и выгрузок; по дате операции. */
    abstract listAll(portalId: string, filter: LedgerFilter): Promise<LedgerEntry[]>;

    /** Проведённая проводка того же контрагента с тем же номером документа. */
    abstract findDocument(
        portalId: string,
        counterpartyId: string,
        documentNumber: string,
        exceptId: string | null
    ): Promise<string | null>;

    /** Какие из документов уже проведены — дубли строк импорта (ключи `documentKeyOf`). */
    abstract existingDocuments(
        portalId: string,
        keys: readonly DocumentKey[]
    ): Promise<Set<string>>;

    /** Какие из источников уже записаны — строки файла, загруженного раньше. */
    abstract existingSources(
        portalId: string,
        sourceType: LedgerSource,
        sourceIds: readonly string[]
    ): Promise<Set<string>>;

    /**
     * Записать проводки; повтор источника (`sourceType`, `sourceId`) пропускается. События
     * строятся от числа записанных: повторный импорт того же файла не сообщает о новых проводках.
     */
    abstract create(
        portalId: string,
        entries: readonly NewLedgerEntry[],
        events: EventsOf<number>
    ): Promise<number>;

    /**
     * Проводка внутри чужой транзакции (поставка товара пишет склад и расход вместе): те же
     * проверки месяца, события пишет вызывающий в ту же транзакцию.
     */
    abstract createIn(
        tx: OutboxTransaction,
        portalId: string,
        entry: NewLedgerEntry,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    abstract update(
        portalId: string,
        id: string,
        change: LedgerEntryChange,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    abstract markVoid(
        portalId: string,
        id: string,
        employeeId: string,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    /**
     * Сверка проводок оплаты заказа под блокировкой заказа: `plan` видит проводки заказа (продажи
     * и их сторно) и решает, что дописать. События одного заказа сверяются по очереди.
     */
    abstract reconcileOrderSale(
        portalId: string,
        orderId: string,
        plan: (sales: LedgerEntry[]) => Promise<LedgerWrite | null>
    ): Promise<LedgerWrite | null>;
}

/** Ключ дубля строкой: для `Set` и сравнения строк файла между собой. */
export const documentKeyOf = (key: DocumentKey): string =>
    `${key.counterpartyId}|${normalizeDocumentNumber(key.documentNumber)}|${key.occurredOn}`;
