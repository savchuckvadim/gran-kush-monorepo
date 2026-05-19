import { Prisma } from "@prisma/client";

/**
 * Стандартный include: заказ, позиции, стадия, запись клиента (EntityRecord) и связанный Member.
 */
export const ORDER_INCLUDE = {
    items: {
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                    sku: true,
                    imageUrl: true,
                    measurementUnit: {
                        select: { id: true, name: true, code: true },
                    },
                },
            },
        },
        orderBy: { createdAt: "asc" as const },
    },
    stage: {
        select: { id: true, name: true, color: true, semantic: true },
    },
    customerEntity: {
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
    employee: {
        select: {
            id: true,
            name: true,
            surname: true,
        },
    },
} satisfies Prisma.OrderInclude;
