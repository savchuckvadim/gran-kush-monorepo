import { Prisma } from "@prisma/client";

/**
 * Стандартный include: заказ, позиции, EntityRecord со стадией (источник правды статуса),
 * member-мост с профильными полями, employee с профильными полями.
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
    entityRecord: {
        select: {
            id: true,
            stage: {
                select: { id: true, name: true, color: true, semantic: true },
            },
        },
    },
    member: {
        select: {
            id: true,
            membershipNumber: true,
            profile: {
                select: {
                    fieldValues: {
                        select: {
                            valueJson: true,
                            fieldDefinition: { select: { fieldKey: true } },
                        },
                    },
                },
            },
        },
    },
    employee: {
        select: {
            id: true,
            role: true,
            profile: {
                select: {
                    fieldValues: {
                        select: {
                            valueJson: true,
                            fieldDefinition: { select: { fieldKey: true } },
                        },
                    },
                },
            },
        },
    },
} satisfies Prisma.OrderInclude;
