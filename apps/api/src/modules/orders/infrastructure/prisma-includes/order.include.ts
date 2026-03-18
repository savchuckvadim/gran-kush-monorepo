import { Prisma } from "@prisma/client";

/**
 * Стандартный include для загрузки заказа с позициями, товарами, членом и сотрудником.
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
    member: {
        select: {
            id: true,
            name: true,
            surname: true,
            membershipNumber: true,
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
