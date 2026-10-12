import { MemberJoinSource } from "@prisma/client";

import type { EntityListFilter } from "@modules/portal/crm/entity-fields/domain/entity-filter";
import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";

/** `q` ищет ещё по email и номеру участника, не только по полям анкеты. */
export type MemberListFilters = EntityListFilter & {
    statusItemId?: string;
};

export abstract class MemberRepository {
    abstract findPageByPortal(
        portalId: string,
        filters: MemberListFilters,
        take: number,
        skip: number
    ): Promise<{ items: MemberWithRelations[]; total: number }>;
    abstract findByIdForPortal(id: string, portalId: string): Promise<MemberWithRelations | null>;
    /** Без tenant-скоупа — только для внутренних сервисов (QR и т.п.) */
    abstract findByUserAndPortal(
        userId: string,
        portalId: string
    ): Promise<MemberWithRelations | null>;
    abstract findAllByUser(userId: string): Promise<MemberWithRelations[]>;
    abstract countByPortal(portalId: string): Promise<number>;
    abstract create(data: {
        userId: string;
        portalId: string;
        membershipNumber?: string;
        statusItemId?: string;
        joinSource?: MemberJoinSource;
        registrationLinkId?: string;
        createdByEmployeeId?: string;
    }): Promise<MemberWithRelations>;
    abstract update(
        id: string,
        data: Partial<{
            membershipNumber: string | null;
            isActive: boolean;
            claimedAt: Date;
        }>
    ): Promise<MemberWithRelations>;
}
