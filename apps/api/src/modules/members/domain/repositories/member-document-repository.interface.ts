import { Prisma } from "@prisma/client";

export type MemberDocumentWithDocument = Prisma.MemberDocumentGetPayload<{
    include: { document: true };
}>;

export abstract class MemberDocumentRepository {
    abstract create(data: {
        memberId: string;
        documentId: string;
        number: string;
        issuedAt?: Date;
        expiresAt?: Date;
        issuedBy?: string;
    }): Promise<MemberDocumentWithDocument>;
    abstract findByMemberId(memberId: string): Promise<MemberDocumentWithDocument[]>;
    abstract deleteByMemberId(memberId: string): Promise<{ count: number }>;
}
