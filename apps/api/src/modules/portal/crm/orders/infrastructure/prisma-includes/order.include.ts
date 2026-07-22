import { Prisma } from "@prisma/client";

import { PROFILE_NAME_FIELD_VALUES } from "@modules/portal/crm/entity-fields/lib/profile-name.select";

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
                select: { fieldValues: PROFILE_NAME_FIELD_VALUES },
            },
        },
    },
    employee: {
        select: {
            id: true,
            role: true,
            profile: {
                select: { fieldValues: PROFILE_NAME_FIELD_VALUES },
            },
        },
    },
} satisfies Prisma.OrderInclude;
