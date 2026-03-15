import { Injectable } from "@nestjs/common";

import {
    MemberDocumentRepository,
    MemberDocumentWithDocument,
} from "@members/domain/repositories/member-document-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class MemberDocumentPrismaRepository implements MemberDocumentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: {
        memberId: string;
        documentId: string;
        number: string;
        issuedAt?: Date;
        expiresAt?: Date;
        issuedBy?: string;
    }): Promise<MemberDocumentWithDocument> {
        return this.prisma.memberDocument.create({
            data,
            include: { document: true },
        });
    }

    async findByMemberId(memberId: string): Promise<MemberDocumentWithDocument[]> {
        return this.prisma.memberDocument.findMany({
            where: { memberId },
            include: { document: true },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        return this.prisma.memberDocument.deleteMany({
            where: { memberId },
        });
    }
}
