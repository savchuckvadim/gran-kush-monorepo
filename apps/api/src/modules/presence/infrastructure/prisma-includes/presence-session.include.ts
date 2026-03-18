import { Prisma } from "@prisma/client";

/**
 * Стандартный include для загрузки сессии присутствия с членом и сотрудником.
 */
export const SESSION_INCLUDE = {
    member: {
        select: {
            id: true,
            name: true,
            surname: true,
            membershipNumber: true,
            isActive: true,
        },
    },
    employee: {
        select: {
            id: true,
            name: true,
            surname: true,
        },
    },
} satisfies Prisma.PresenceSessionInclude;
