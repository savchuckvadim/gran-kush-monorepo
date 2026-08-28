import { FinancialTransaction } from "@modules/portal/crm/finance/domain/entity/financial-transaction.entity";

// ─── Фильтры для выборки транзакций ─────────────────────────────────────────

/**
 * Портал сюда намеренно не входит. Он передаётся отдельным обязательным
 * аргументом каждого метода: фильтр можно не передать вовсе (`findAll()`),
 * и тогда выборка молча уехала бы по всем клубам сразу.
 */
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
    /** Портал, которому принадлежит проводка. Проверяется против member/order. */
    portalId: string;
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

/**
 * Источник проводки — ключ идемпотентности. Пара `(sourceType, sourceId)`
 * уникальна: повторный вызов с тем же источником не создаёт вторую проводку.
 * Ручные транзакции источника не имеют и под ограничение не попадают.
 */
export interface TransactionSource {
    type: string;
    id: string;
}

export interface CreateSourcedTransactionInput extends CreateTransactionInput {
    source: TransactionSource;
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
    /** Найти транзакцию по ID в пределах портала */
    abstract findByIdForPortal(id: string, portalId: string): Promise<FinancialTransaction | null>;

    /** Все транзакции портала с фильтрами, пагинацией и сортировкой */
    abstract findAll(
        portalId: string,
        filters?: TransactionFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<FinancialTransaction[]>;

    /** Подсчет транзакций портала */
    abstract count(portalId: string, filters?: TransactionFilters): Promise<number>;

    /** Создать транзакцию */
    abstract create(data: CreateTransactionInput): Promise<FinancialTransaction>;

    /**
     * Создать проводку идемпотентно по её источнику. Повторный вызов с тем же
     * `source` возвращает уже созданную проводку вместо второй.
     */
    abstract createFromSource(data: CreateSourcedTransactionInput): Promise<FinancialTransaction>;

    /** Суммарная статистика по периоду в пределах портала */
    abstract getSummary(
        portalId: string,
        startDate?: Date,
        endDate?: Date,
        memberId?: string
    ): Promise<TransactionSummary>;

    /** Группировка по типу в пределах портала */
    abstract getGroupedByType(
        portalId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<TransactionGroupedByType[]>;

    /** Группировка по дате (для графиков) в пределах портала */
    abstract getGroupedByDate(
        portalId: string,
        startDate: Date,
        endDate: Date
    ): Promise<TransactionGroupedByDate[]>;
}
