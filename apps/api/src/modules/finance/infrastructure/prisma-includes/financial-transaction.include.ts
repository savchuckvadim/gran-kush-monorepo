import { Prisma } from "@prisma/client";

/**
 * Стандартный include для загрузки транзакции с заказом, членом и сотрудником.
 */
export const TRANSACTION_INCLUDE = {
    order: {
        select: {
            id: true,
            orderNumber: true,
            status: true,
        },
    },
    member: {
        select: {
            id: true,
            name: true,
            surname: true,
            membershipNumber: true,
        },
    },
    createdByEmployee: {
        select: {
            id: true,
            name: true,
            surname: true,
        },
    },
} satisfies Prisma.FinancialTransactionInclude;
