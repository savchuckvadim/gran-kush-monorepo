import { Prisma } from "@prisma/client";

export const SESSION_INCLUDE = {
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
    employee: {
        select: {
            id: true,
            name: true,
            surname: true,
        },
    },
} satisfies Prisma.PresenceSessionInclude;
