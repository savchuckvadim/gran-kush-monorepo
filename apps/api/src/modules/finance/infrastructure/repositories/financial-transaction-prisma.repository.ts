import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";

type Decimal = Prisma.Decimal;

import { FinancialTransaction } from "@finance/domain/entity/financial-transaction.entity";
import {
    CreateTransactionInput,
    FinancialTransactionRepository,
    TransactionFilters,
    TransactionGroupedByDate,
    TransactionGroupedByType,
    TransactionSummary,
} from "@finance/domain/repositories/financial-transaction-repository.interface";
import { TRANSACTION_INCLUDE } from "@finance/infrastructure/prisma-includes";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class FinancialTransactionPrismaRepository extends FinancialTransactionRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    // ─── Поиск по ID ─────────────────────────────────────────────────────────

    async findById(id: string): Promise<FinancialTransaction | null> {
        const row = await this.prisma.financialTransaction.findUnique({
            where: { id },
            include: TRANSACTION_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    // ─── Список с фильтрами ─────────────────────────────────────────────────

    async findAll(
        filters?: TransactionFilters,
        limit?: number,
        skip?: number,
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Promise<FinancialTransaction[]> {
        const where = this.buildWhere(filters);
        const orderBy = this.buildOrderBy(sortBy, sortOrder);

        const rows = await this.prisma.financialTransaction.findMany({
            where,
            include: TRANSACTION_INCLUDE,
            take: limit,
            skip,
            orderBy,
        });

        return rows.map((row) => this.mapToEntity(row));
    }

    // ─── Подсчет ─────────────────────────────────────────────────────────────

    async count(filters?: TransactionFilters): Promise<number> {
        const where = this.buildWhere(filters);
        return this.prisma.financialTransaction.count({ where });
    }

    // ─── Создание ────────────────────────────────────────────────────────────

    async create(data: CreateTransactionInput): Promise<FinancialTransaction> {
        const row = await this.prisma.financialTransaction.create({
            data: {
                orderId: data.orderId,
                memberId: data.memberId,
                type: data.type,
                direction: data.direction,
                amount: new Prisma.Decimal(data.amount),
                currency: data.currency ?? "EUR",
                paymentMethod: data.paymentMethod,
                transactionDate: data.transactionDate ?? new Date(),
                createdBy: data.createdBy,
                description: data.description,
                notes: data.notes,
            },
            include: TRANSACTION_INCLUDE,
        });

        return this.mapToEntity(row);
    }

    // ─── Суммарная статистика ────────────────────────────────────────────────

    async getSummary(
        startDate?: Date,
        endDate?: Date,
        memberId?: string
    ): Promise<TransactionSummary> {
        const where: Prisma.FinancialTransactionWhereInput = {};
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate.gte = startDate;
            if (endDate) where.transactionDate.lte = endDate;
        }
        if (memberId) where.memberId = memberId;

        const [incomeAgg, expenseAgg, countResult] = await Promise.all([
            this.prisma.financialTransaction.aggregate({
                where: { ...where, direction: "income" },
                _sum: { amount: true },
            }),
            this.prisma.financialTransaction.aggregate({
                where: { ...where, direction: "expense" },
                _sum: { amount: true },
            }),
            this.prisma.financialTransaction.count({ where }),
        ]);

        const totalIncome = Number(incomeAgg._sum.amount ?? 0);
        const totalExpense = Number(expenseAgg._sum.amount ?? 0);

        return {
            totalIncome,
            totalExpense,
            netTotal: totalIncome - totalExpense,
            transactionCount: countResult,
        };
    }

    // ─── Группировка по типу ─────────────────────────────────────────────────

    async getGroupedByType(startDate?: Date, endDate?: Date): Promise<TransactionGroupedByType[]> {
        const where: Prisma.FinancialTransactionWhereInput = {};
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate.gte = startDate;
            if (endDate) where.transactionDate.lte = endDate;
        }

        const groups = await this.prisma.financialTransaction.groupBy({
            by: ["type", "direction"],
            where,
            _sum: { amount: true },
            _count: true,
        });

        return groups.map((g) => ({
            type: g.type,
            direction: g.direction,
            count: g._count,
            totalAmount: Number(g._sum.amount ?? 0),
        }));
    }

    // ─── Группировка по дате ─────────────────────────────────────────────────

    async getGroupedByDate(startDate: Date, endDate: Date): Promise<TransactionGroupedByDate[]> {
        // Используем raw-запрос для группировки по дням
        const rows = await this.prisma.$queryRaw<
            Array<{
                date: string;
                direction: string;
                total: Decimal;
                cnt: bigint;
            }>
        >`
            SELECT
                DATE(transaction_date) AS "date",
                direction,
                COALESCE(SUM(amount), 0) AS total,
                COUNT(*)::bigint AS cnt
            FROM financial_transactions
            WHERE transaction_date >= ${startDate}
              AND transaction_date <= ${endDate}
            GROUP BY DATE(transaction_date), direction
            ORDER BY "date" ASC
        `;

        // Группируем по дате
        const dateMap = new Map<string, { income: number; expense: number; count: number }>();

        for (const row of rows) {
            const dateStr = String(row.date);
            const existing = dateMap.get(dateStr) ?? {
                income: 0,
                expense: 0,
                count: 0,
            };

            const amount = Number(row.total);
            const count = Number(row.cnt);

            if (row.direction === "income") {
                existing.income += amount;
            } else {
                existing.expense += amount;
            }
            existing.count += count;

            dateMap.set(dateStr, existing);
        }

        return Array.from(dateMap.entries()).map(([date, data]) => ({
            date,
            income: data.income,
            expense: data.expense,
            net: data.income - data.expense,
            count: data.count,
        }));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ═══════════════════════════════════════════════════════════════════════════

    private buildWhere(filters?: TransactionFilters): Prisma.FinancialTransactionWhereInput {
        if (!filters) return {};

        const where: Prisma.FinancialTransactionWhereInput = {};

        if (filters.orderId) where.orderId = filters.orderId;
        if (filters.memberId) where.memberId = filters.memberId;
        if (filters.createdBy) where.createdBy = filters.createdBy;
        if (filters.type) where.type = filters.type;
        if (filters.direction) where.direction = filters.direction;
        if (filters.paymentMethod) where.paymentMethod = filters.paymentMethod;

        if (filters.search) {
            where.OR = [
                { description: { contains: filters.search, mode: "insensitive" } },
                { notes: { contains: filters.search, mode: "insensitive" } },
            ];
        }

        if (filters.startDate || filters.endDate) {
            where.transactionDate = {};
            if (filters.startDate) where.transactionDate.gte = filters.startDate;
            if (filters.endDate) where.transactionDate.lte = filters.endDate;
        }

        return where;
    }

    private buildOrderBy(
        sortBy?: string,
        sortOrder?: "asc" | "desc"
    ): Prisma.FinancialTransactionOrderByWithRelationInput {
        const order = sortOrder ?? "desc";

        switch (sortBy) {
            case "amount":
                return { amount: order };
            case "type":
                return { type: order };
            case "transactionDate":
                return { transactionDate: order };
            default:
                return { createdAt: order };
        }
    }

    // ─── Маппинг ─────────────────────────────────────────────────────────────

    private mapToEntity(row: any): FinancialTransaction {
        return new FinancialTransaction({
            id: row.id,
            orderId: row.orderId,
            memberId: row.memberId,
            type: row.type,
            direction: row.direction,
            amount: row.amount,
            currency: row.currency,
            paymentMethod: row.paymentMethod,
            transactionDate: row.transactionDate,
            createdAt: row.createdAt,
            createdBy: row.createdBy,
            description: row.description,
            notes: row.notes,
            order: row.order ?? null,
            member: row.member ?? null,
            createdByEmployee: row.createdByEmployee ?? null,
        });
    }
}
