import { Prisma } from "@prisma/client";

export type MemberMjStatusWithStatus = Prisma.MemberMjStatusGetPayload<{
    include: { mjStatus: true };
}>;

export abstract class MemberMjStatusRepository {
    abstract create(data: {
        memberId: string;
        mjStatusId: string;
    }): Promise<MemberMjStatusWithStatus>;
    abstract deleteByMemberId(memberId: string): Promise<{ count: number }>;
    abstract findByMemberId(memberId: string): Promise<MemberMjStatusWithStatus[]>;
}
