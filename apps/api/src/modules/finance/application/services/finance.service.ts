import { Injectable, Logger, NotFoundException } from "@nestjs/common";

import { CreateFinancialTransactionDto } from "@finance/api/dto/financial-transaction.dto";
import {
    FinancialTransaction,
    TransactionDirection,
    TransactionType,
} from "@finance/domain/entity/financial-transaction.entity";
import {
    FinancialTransactionRepository,
    TransactionFilters,
    TransactionGroupedByDate,
    TransactionGroupedByType,
    TransactionSummary,
} from "@finance/domain/repositories/financial-transaction-repository.interface";

@Injectable()
export class FinanceService {
    private readonly logger = new Logger(FinanceService.name);

    constructor(private readonly transactionRepository: FinancialTransactionRepository) {}

    // ═══════════════════════════════════════════════════════════════════════════
    // Queries
    // ═══════════════════════════════════════════════════════════════════════════

    /** Найти транзакцию по ID */
    async findById(id: string): Promise<FinancialTransaction | null> {
        return this.transactionRepository.findById(id);
    }

    /** Найти транзакцию по ID или кинуть 404 */
    async findByIdOrFail(id: string): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.findById(id);
        if (!txn) {
            throw new NotFoundException(`Транзакция с ID "${id}" не найдена`);
        }
        return txn;
    }

    /** Все транзакции с фильтрами */
    async findAll(
        filters?: TransactionFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<FinancialTransaction[]> {
        return this.transactionRepository.findAll(filters, limit, skip, sortBy, sortOrder);
    }

    /** Подсчёт */
    async count(filters?: TransactionFilters): Promise<number> {
        return this.transactionRepository.count(filters);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Create
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Создать ручную финансовую транзакцию (сотрудник CRM).
     */
    async createManualTransaction(
        dto: CreateFinancialTransactionDto,
        employeeId: string
    ): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.create({
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
            `💰 Транзакция создана: ${txn.type} / ${txn.direction} / ${txn.amount} ${txn.currency} ` +
                `(сотрудник: ${employeeId})`
        );

        return txn;
    }

    /**
     * Создать автоматическую транзакцию при оплате заказа.
     * Вызывается из OrdersService при подтверждении оплаты.
     */
    async createOrderPaymentTransaction(
        orderId: string,
        memberId: string,
        amount: number,
        paymentMethod?: string,
        employeeId?: string
    ): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.create({
            orderId,
            memberId,
            type: TransactionType.ORDER_PAYMENT,
            direction: TransactionDirection.INCOME,
            amount,
            paymentMethod,
            createdBy: employeeId,
            description: `Оплата заказа`,
        });

        this.logger.log(
            `💰 Оплата заказа ${orderId}: +${amount} EUR (${paymentMethod ?? "не указан"})`
        );

        return txn;
    }

    /**
     * Создать транзакцию возврата.
     */
    async createRefundTransaction(
        orderId: string,
        memberId: string,
        amount: number,
        employeeId: string,
        description?: string
    ): Promise<FinancialTransaction> {
        const txn = await this.transactionRepository.create({
            orderId,
            memberId,
            type: TransactionType.REFUND,
            direction: TransactionDirection.EXPENSE,
            amount,
            createdBy: employeeId,
            description: description ?? "Возврат средств",
        });

        this.logger.log(
            `💸 Возврат по заказу ${orderId}: -${amount} EUR (сотрудник: ${employeeId})`
        );

        return txn;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Reports
    // ═══════════════════════════════════════════════════════════════════════════

    /** Суммарная статистика */
    async getSummary(
        startDate?: Date,
        endDate?: Date,
        memberId?: string
    ): Promise<TransactionSummary> {
        return this.transactionRepository.getSummary(startDate, endDate, memberId);
    }

    /** Группировка по типу */
    async getGroupedByType(startDate?: Date, endDate?: Date): Promise<TransactionGroupedByType[]> {
        return this.transactionRepository.getGroupedByType(startDate, endDate);
    }

    /** Группировка по дате (для графиков) */
    async getGroupedByDate(startDate: Date, endDate: Date): Promise<TransactionGroupedByDate[]> {
        return this.transactionRepository.getGroupedByDate(startDate, endDate);
    }
}
