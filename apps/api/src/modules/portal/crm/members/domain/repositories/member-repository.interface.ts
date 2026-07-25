import { MemberJoinSource } from "@prisma/client";

import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";

export type MemberListFilters = {
    statusItemId?: string;
    filterFieldKey?: string;
    filterValue?: string;
};

export abstract class MemberRepository {
    abstract findAllByPortal(
        portalId: string,
        limit?: number,
        skip?: number,
        filters?: MemberListFilters
    ): Promise<MemberWithRelations[]>;
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
