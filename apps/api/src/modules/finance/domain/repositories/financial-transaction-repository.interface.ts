import { FinancialTransaction } from "@finance/domain/entity/financial-transaction.entity";

// ─── Фильтры для выборки транзакций ─────────────────────────────────────────

export interface TransactionFilters {
    orderId?: string;
    memberId?: string;
    createdBy?: string;
    type?: string;
    direction?: string;
    paymentMethod?: string;
    /** Начало периода */
    startDate?: Date;
    /** Конец периода */
    endDate?: Date;
    /** Поиск по description / notes */
    search?: string;
}

// ─── Данные для создания транзакции ──────────────────────────────────────────

export interface CreateTransactionInput {
    orderId?: string;
    memberId?: string;
    type: string;
    direction: string;
    amount: number;
    currency?: string;
    paymentMethod?: string;
    transactionDate?: Date;
    createdBy?: string;
    description?: string;
    notes?: string;
}

// ─── Агрегации ──────────────────────────────────────────────────────────────

export interface TransactionSummary {
    totalIncome: number;
    totalExpense: number;
    netTotal: number;
    transactionCount: number;
}

export interface TransactionGroupedByType {
    type: string;
    direction: string;
    count: number;
    totalAmount: number;
}

export interface TransactionGroupedByDate {
    date: string;
    income: number;
    expense: number;
    net: number;
    count: number;
}

// ─── Интерфейс репозитория ──────────────────────────────────────────────────

export abstract class FinancialTransactionRepository {
    /** Найти транзакцию по ID */
    abstract findById(id: string): Promise<FinancialTransaction | null>;

    /** Все транзакции с фильтрами, пагинацией и сортировкой */
    abstract findAll(
        filters?: TransactionFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<FinancialTransaction[]>;

    /** Подсчет транзакций */
    abstract count(filters?: TransactionFilters): Promise<number>;

    /** Создать транзакцию */
    abstract create(data: CreateTransactionInput): Promise<FinancialTransaction>;

    /** Суммарная статистика по периоду */
    abstract getSummary(
        startDate?: Date,
        endDate?: Date,
        memberId?: string
    ): Promise<TransactionSummary>;

    /** Группировка по типу */
    abstract getGroupedByType(
        startDate?: Date,
        endDate?: Date
    ): Promise<TransactionGroupedByType[]>;

    /** Группировка по дате (для графиков) */
    abstract getGroupedByDate(startDate: Date, endDate: Date): Promise<TransactionGroupedByDate[]>;
}
