import { MemberWithRelations } from "@modules/members/domain/entity/member.entity";

export abstract class MemberRepository {
    abstract findAll(limit?: number, skip?: number): Promise<MemberWithRelations[]>;
    abstract findById(id: string): Promise<MemberWithRelations | null>;
    abstract findByUserId(userId: string): Promise<MemberWithRelations | null>;
    abstract count(): Promise<number>;
    abstract create(data: {
        userId: string;
        name: string;
        surname?: string;
        phone?: string;
        birthday?: Date;
        membershipNumber?: string;
        address?: string;
        status?: string;
        notes?: string;
    }): Promise<MemberWithRelations>;
    abstract update(
        id: string,
        data: Partial<{
            name: string;
            surname: string;
            phone: string;
            birthday: Date;
            membershipNumber: string;
            address: string;
            status: string;
            notes: string;
            isActive: boolean;
        }>
    ): Promise<MemberWithRelations>;
}
