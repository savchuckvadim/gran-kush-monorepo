import { Prisma } from "@prisma/client";
/**
 * Domain Entity - Member
 * Чистая бизнес-логика, без зависимостей от Prisma
 */
export class Member {
    id: string;
    userId: string;
    portalId?: string;
    // Личные данные
    name: string;
    surname?: string;
    phone?: string;
    birthday?: Date;
    documentType?: string;
    documentNumber?: string;
    // Данные членства
    membershipNumber?: string;
    address?: string;
    // Статусы употребления
    isMedical?: boolean;
    isMj: boolean;
    isRecreation: boolean;
    // Статус заявки
    status: string;
    // Дополнительные данные
    notes?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Member>) {
        Object.assign(this, partial);
    }
}

export const memberWithRelationsInclude = {
    user: true,
    identityDocuments: true,
    signature: true,
    memberMjStatuses: { include: { mjStatus: true } },
    memberDocuments: { include: { document: true } },
} as const satisfies Prisma.MemberInclude;

export type MemberWithRelations = Prisma.MemberGetPayload<{
    include: typeof memberWithRelationsInclude;
}>;
