import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { CreateFinancialTransactionDto } from "@modules/portal/crm/finance/api/dto/financial-transaction.dto";
import {
    FinancialTransaction,
    TransactionDirection,
    TransactionType,
} from "@modules/portal/crm/finance/domain/entity/financial-transaction.entity";
import {
    FinancialTransactionRepository,
    TransactionFilters,
    TransactionGroupedByDate,
    TransactionGroupedByType,
    TransactionSummary,
} from "@modules/portal/crm/finance/domain/repositories/financial-transaction-repository.interface";

/** Типы источников проводок — ключ идемпотентности вместе с id источника. */
export const TRANSACTION_SOURCE_TYPES = {
    ORDER_PAYMENT: "order_payment",
    ORDER_REFUND: "order_refund",
} as const;

@Injectable()
export class FinanceService {
    private readonly logger = new Logger(FinanceService.name);

    constructor(private readonly transactionRepository: FinancialTransactionRepository) {}

    // ═══════════════════════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════════════════════

    /** Найти транзакцию по ID в пределах портала */
    async findById(id: string, portalId: string): Promise<FinancialTransaction | null> {
        return this.transactionRepository.findByIdForPortal(id, portalId);
    }

    /** Найти транзакцию по ID или кинуть 404 */
    async findByIdOrFail(id: string, portalId: string): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.findByIdForPortal(id, portalId);
        if (!txn) {
            throw new NotFoundException(`Транзакция с ID "${id}" не найдена`);
        }
        return txn;
    }

    /** Все транзакции портала с фильтрами */
    async findAll(
        portalId: string,
        filters?: TransactionFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<FinancialTransaction[]> {
        return this.transactionRepository.findAll(
            portalId,
            filters,
            limit,
            skip,
            sortBy,
            sortOrder
        );
    }

    /** Подсчёт */
    async count(portalId: string, filters?: TransactionFilters): Promise<number> {
        return this.transactionRepository.count(portalId, filters);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Create
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Создать ручную финансовую транзакцию (сотрудник CRM).
     * Источника не имеет: сумму и назначение задаёт человек, дедуплицировать нечего.
     */
    async createManualTransaction(
        dto: CreateFinancialTransactionDto,
        employeeId: string,
        portalId: string
    ): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.create({
            portalId,
            orderId: dto.orderId,
            memberId: dto.memberId,
            type: dto.type,
            direction: dto.direction,
            amount: dto.amount,
            currency: dto.currency,
            paymentMethod: dto.paymentMethod,
            description: dto.description,
            notes: dto.notes,
            createdBy: employeeId,
        });

        this.logger.log(
            `💰 Транзакция создана: ${txn.type} / ${txn.direction} / ${txn.amount.toString()} ${txn.currency} ` +
                `(сотрудник: ${employeeId})`
        );

        return txn;
    }

    /**
     * Проводка оплаты заказа. Идемпотентна по заказу: повторное подтверждение
     * оплаты вернёт уже существующую проводку, а не заведёт вторую.
     *
     * Сумма и валюта берутся из заказа, а не из аргументов — принимать их извне
     * значит доверять сумму денег вызывающему коду или запросу.
     */
    async createOrderPaymentTransaction(input: {
        portalId: string;
        orderId: string;
        memberId: string;
        amount: number;
        currency: string;
        paymentMethod?: string;
        employeeId?: string;
    }): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.createFromSource({
            portalId: input.portalId,
            orderId: input.orderId,
            memberId: input.memberId,
            type: TransactionType.ORDER_PAYMENT,
            direction: TransactionDirection.INCOME,
            amount: input.amount,
            currency: input.currency,
            paymentMethod: input.paymentMethod,
            createdBy: input.employeeId,
            description: `Оплата заказа`,
            source: { type: TRANSACTION_SOURCE_TYPES.ORDER_PAYMENT, id: input.orderId },
        });

        this.logger.log(
            `💰 Оплата заказа ${input.orderId}: +${input.amount} ${input.currency} ` +
                `(${input.paymentMethod ?? "не указан"})`
        );

        return txn;
    }

    /**
     * Проводка возврата. Идемпотентна по источнику; по умолчанию источник —
     * сам заказ, то есть один возврат на заказ. Для частичных возвратов
     * вызывающий передаёт свой `sourceId` (например id возврата у провайдера).
     */
    async createRefundTransaction(input: {
        portalId: string;
        orderId: string;
        memberId: string;
        amount: number;
        currency: string;
        employeeId: string;
        description?: string;
        sourceId?: string;
    }): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.createFromSource({
            portalId: input.portalId,
            orderId: input.orderId,
            memberId: input.memberId,
            type: TransactionType.REFUND,
            direction: TransactionDirection.EXPENSE,
            amount: input.amount,
            currency: input.currency,
            createdBy: input.employeeId,
            description: input.description ?? "Возврат средств",
            source: {
                type: TRANSACTION_SOURCE_TYPES.ORDER_REFUND,
                id: input.sourceId ?? input.orderId,
            },
        });

        this.logger.log(
            `💸 Возврат по заказу ${input.orderId}: -${input.amount} ${input.currency} ` +
                `(сотрудник: ${input.employeeId})`
        );

        return txn;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Reports
    // ═══════════════════════════════════════════════════════════════════════════

    /** Суммарная статистика */
    async getSummary(
        portalId: string,
        startDate?: Date,
        endDate?: Date,
        memberId?: string
    ): Promise<TransactionSummary> {
        return this.transactionRepository.getSummary(portalId, startDate, endDate, memberId);
    }

    /** Группировка по типу */
    async getGroupedByType(
        portalId: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<TransactionGroupedByType[]> {
        return this.transactionRepository.getGroupedByType(portalId, startDate, endDate);
    }

    /** Группировка по дате (для графиков) */
    async getGroupedByDate(
        portalId: string,
        startDate: Date,
        endDate: Date
    ): Promise<TransactionGroupedByDate[]> {
        return this.transactionRepository.getGroupedByDate(portalId, startDate, endDate);
    }
}
