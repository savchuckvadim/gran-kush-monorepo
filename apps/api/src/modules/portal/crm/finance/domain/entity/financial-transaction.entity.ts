import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

/**
 * Типы транзакций
 */
export enum TransactionType {
    ORDER_PAYMENT = "order_payment",
    REFUND = "refund",
    ADJUSTMENT = "adjustment",
    MANUAL = "manual",
}

/**
 * Направление транзакции
 */
export enum TransactionDirection {
    INCOME = "income",
    EXPENSE = "expense",
}

/**
 * Методы оплаты
 */
export enum PaymentMethod {
    CASH = "cash",
    CARD = "card",
    CRYPTO = "crypto",
}

/**
 * Domain Entity — FinancialTransaction (Финансовая транзакция)
 */
export class FinancialTransaction {
    id: string;
    orderId?: string | null;
    memberId?: string | null;

    // Тип и направление
    type: string; // TransactionType value
    direction: string; // TransactionDirection value

    // Суммы
    amount: Decimal;
    currency: string;

    // Метод оплаты
    paymentMethod?: string | null;

    // Временные метки
    transactionDate: Date;
    createdAt: Date;
    createdBy?: string | null;

    // Примечания
    description?: string | null;
    notes?: string | null;

    // Relations (опционально загружаемые)
    order?: {
        id: string;
        orderNumber: string;
        status: string;
    } | null;
    member?: {
        id: string;
        name: string;
        surname?: string | null;
        membershipNumber?: string | null;
    } | null;
    createdByEmployee?: {
        id: string;
        name: string;
        surname?: string | null;
    } | null;

    constructor(partial: Partial<FinancialTransaction>) {
        Object.assign(this, partial);
    }
}
