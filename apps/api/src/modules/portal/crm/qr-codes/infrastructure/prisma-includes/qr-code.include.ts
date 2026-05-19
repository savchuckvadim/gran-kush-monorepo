import { Prisma } from "@prisma/client";

export const QR_CODE_INCLUDE = {
    entityRecord: {
        select: {
            id: true,
            member: {
                select: {
                    id: true,
                    membershipNumber: true,
                    isActive: true,
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
} satisfies Prisma.QrCodeInclude;
