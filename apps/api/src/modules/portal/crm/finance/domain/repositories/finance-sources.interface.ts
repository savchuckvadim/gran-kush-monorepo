import type { PortalTypeEnum } from "@prisma/client";

import type { NewDomainEvent } from "@modules/events";

import type { LedgerLine } from "../ledger/ledger-entry";

/** Оплата заказа глазами учёта: что оплачено и по каким ставкам. Суммы — в центах. */
export interface OrderSale {
    orderId: string;
    orderNumber: string;
    memberId: string;
    paid: boolean;
    cancelled: boolean;
    /** Строки по ставкам (одна ставка — одна строка); без снимка налога — одна строка без разбивки */
    lines: LedgerLine[];
}

/** Заказы учёт только читает: заказы о финансах не знают, финансы слушают их события. */
export abstract class OrderSaleSource {
    abstract saleOf(portalId: string, orderId: string): Promise<OrderSale | null>;
}

/** Справочные данные клуба для учёта: тип, часовой пояс, имена людей. */
export abstract class FinanceDirectory {
    abstract portalType(portalId: string): Promise<PortalTypeEnum | null>;

    /** IANA-пояс клуба: в нём считается дата оплаты и «текущий месяц». */
    abstract timeZone(portalId: string): Promise<string>;

    abstract memberExists(portalId: string, memberId: string): Promise<boolean>;

    abstract memberNames(
        portalId: string,
        memberIds: readonly string[]
    ): Promise<Map<string, string>>;

    abstract employeeNames(
        portalId: string,
        employeeIds: readonly string[]
    ): Promise<Map<string, string>>;
}

/**
 * Вложения проводок (чеки, фактуры) в private storage. Хранилище видит только шифр ключа
 * портала: адаптер шифрует при записи и расшифровывает при чтении.
 */
export abstract class FinanceAttachmentStore {
    /** Путь сохранённого файла — его хранит проводка. */
    abstract put(portalId: string, entryId: string, file: Buffer): Promise<string>;

    abstract get(portalId: string, entryId: string, path: string): Promise<Buffer>;

    abstract remove(path: string): Promise<void>;
}

/** Журнал доступа к учёту: выгрузка данных — событие в журнале клуба без самих данных. */
export abstract class FinanceAuditLog {
    abstract record(events: readonly NewDomainEvent[]): Promise<void>;
}

/** Проводка старой таблицы `financial_transactions` (до TASK-798), ещё не перенесённая в реестр. */
export interface LegacyTransaction {
    id: string;
    portalId: string;
    type: string;
    direction: string;
    /** Евро */
    amount: number;
    currency: string;
    paymentMethod: string | null;
    transactionDate: Date;
    description: string | null;
    notes: string | null;
    createdBy: string | null;
}

/** Старая таблица проводок: что ещё не перенесено. Удаляется вместе с таблицей в TASK-799. */
export abstract class LegacyTransactionSource {
    abstract pending(): Promise<LegacyTransaction[]>;
}
