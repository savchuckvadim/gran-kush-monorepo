import { Prisma } from "@prisma/client";

export const TRANSACTION_INCLUDE = {
    order: {
        select: {
            id: true,
            orderNumber: true,
        },
    },
    entityRecord: {
        select: {
            id: true,
            member: {
                select: {
                    id: true,
                    membershipNumber: true,
                },
            },
            fieldValues: {
                select: {
                    valueJson: true,
                    fieldDefinition: { select: { fieldKey: true } },
                },
            },
        },
    },
    createdByEmployee: {
        select: {
            id: true,
            role: true,
        },
    },
} satisfies Prisma.FinancialTransactionInclude;
