import {
    FinancialTransactionDetailDto,
    FinancialTransactionListDto,
} from "@finance/api/dto/financial-transaction.dto";
import { FinancialTransaction } from "@finance/domain/entity/financial-transaction.entity";

/**
 * Маппинг FinancialTransaction entity → FinancialTransactionListDto
 */
export function mapTransactionToListDto(t: FinancialTransaction): FinancialTransactionListDto {
    return {
        id: t.id,
        type: t.type,
        direction: t.direction,
        amount: Number(t.amount),
        currency: t.currency,
        paymentMethod: t.paymentMethod,
        description: t.description,
        transactionDate: t.transactionDate.toISOString(),
        order: t.order,
        member: t.member,
        createdByEmployee: t.createdByEmployee,
        createdAt: t.createdAt.toISOString(),
    };
}

/**
 * Маппинг FinancialTransaction entity → FinancialTransactionDetailDto
 */
export function mapTransactionToDetailDto(t: FinancialTransaction): FinancialTransactionDetailDto {
    return {
        ...mapTransactionToListDto(t),
        orderId: t.orderId,
        memberId: t.memberId,
        notes: t.notes,
    };
}
