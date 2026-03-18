import { Prisma } from "@prisma/client";

/**
 * Стандартный include для загрузки QR-кода с данными о члене.
 */
export const QR_CODE_INCLUDE = {
    member: {
        select: {
            id: true,
            name: true,
            surname: true,
            membershipNumber: true,
            isActive: true,
        },
    },
} satisfies Prisma.QrCodeInclude;
