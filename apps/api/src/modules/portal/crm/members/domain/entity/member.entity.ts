import { MemberJoinSource, Prisma } from "@prisma/client";

/**
 * Domain Entity - Member
 * Мост User ↔ Portal ↔ EntityRecord: один user может быть member в нескольких порталах.
 * Профильные данные живут в FieldValue профильной EntityRecord.
 */
export class Member {
    id: string;
    userId: string;
    portalId: string;
    entityRecordId: string;
    membershipNumber?: string;
    isActive: boolean;
    joinSource: MemberJoinSource;
    claimedAt?: Date;
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
        },
    },
} as const satisfies Prisma.MemberInclude;

export type MemberWithRelations = Prisma.MemberGetPayload<{
    include: typeof memberWithRelationsInclude;
}>;
