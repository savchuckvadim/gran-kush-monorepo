import { Prisma } from "@prisma/client";

import { PROFILE_NAME_FIELD_VALUES } from "@modules/portal/crm/entity-fields/lib/profile-name.select";

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
            fieldValues: PROFILE_NAME_FIELD_VALUES,
        },
    },
    employee: {
        select: {
            id: true,
            role: true,
        },
    },
} satisfies Prisma.PresenceSessionInclude;
