import { IdentityDocument } from "@prisma/client";

export abstract class IdentityDocumentRepository {
    abstract create(data: {
        memberId: string;
        type: string;
        side: string;
        storagePath: string;
    }): Promise<IdentityDocument>;
    abstract upsertByMemberTypeAndSide(data: {
        memberId: string;
        type: string;
        side: string;
        storagePath: string;
    }): Promise<IdentityDocument>;
    abstract findByMemberId(memberId: string): Promise<IdentityDocument[]>;
    abstract findByMemberIdAndType(memberId: string, type: string): Promise<IdentityDocument[]>;
    abstract deleteByMemberId(memberId: string): Promise<{ count: number }>;
    abstract deleteByMemberIdAndType(memberId: string, type: string): Promise<{ count: number }>;
}
