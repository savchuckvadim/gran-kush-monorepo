import { MemberWithRelations } from "@modules/portal/crm/members/domain/entity/member.entity";

export type MemberListFilters = {
    portalId?: string;
    statusItemId?: string;
    filterFieldKey?: string;
    filterValue?: string;
};

export abstract class MemberRepository {
    abstract findAll(
        limit?: number,
        skip?: number,
        filters?: MemberListFilters
    ): Promise<MemberWithRelations[]>;
    abstract findById(id: string): Promise<MemberWithRelations | null>;
    abstract findByUserId(userId: string): Promise<MemberWithRelations | null>;
    abstract count(): Promise<number>;
    abstract create(data: {
        userId: string;
        portalId?: string;
        membershipNumber?: string;
        statusItemId?: string;
    }): Promise<MemberWithRelations>;
    abstract update(
        id: string,
        data: Partial<{
            membershipNumber: string | null;
            isActive: boolean;
        }>
    ): Promise<MemberWithRelations>;
}
