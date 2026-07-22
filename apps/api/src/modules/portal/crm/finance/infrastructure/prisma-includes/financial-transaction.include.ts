import { Prisma } from "@prisma/client";

import { PROFILE_NAME_FIELD_VALUES } from "@modules/portal/crm/entity-fields/lib/profile-name.select";

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
            fieldValues: PROFILE_NAME_FIELD_VALUES,
        },
    },
    createdByEmployee: {
        select: {
            id: true,
            role: true,
        },
    },
} satisfies Prisma.FinancialTransactionInclude;
