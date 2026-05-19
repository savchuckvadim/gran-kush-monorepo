import { Prisma } from "@prisma/client";

/**
 * Domain Entity - Member
 * Профильные данные в FieldValue привязаны к EntityRecord (profile); Member — мост User ↔ запись.
 */
export class Member {
    id: string;
    userId: string;
    portalId?: string;
    entityRecordId: string;
    membershipNumber?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Member>) {
        Object.assign(this, partial);
    }
}

export const memberWithRelationsInclude = {
    user: true,
    profile: {
        include: {
            statusItem: true,
            fieldValues: {
                orderBy: [{ fieldDefinitionId: "asc" as const }, { valueIndex: "asc" as const }],
                include: { fieldDefinition: true },
            },
            identityDocuments: true,
            signature: true,
            memberMjStatuses: { include: { mjStatus: true } },
            memberDocuments: { include: { document: true } },
        },
    },
} as const satisfies Prisma.MemberInclude;

export type MemberWithRelations = Prisma.MemberGetPayload<{
    include: typeof memberWithRelationsInclude;
}>;
