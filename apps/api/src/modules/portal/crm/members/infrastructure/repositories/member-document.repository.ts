import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    MemberDocumentRepository,
    MemberDocumentWithDocument,
} from "@modules/portal/crm/members/domain/repositories/member-document-repository.interface";

@Injectable()
export class MemberDocumentPrismaRepository implements MemberDocumentRepository {
    constructor(private readonly prisma: PrismaService) {}

    private async entityRecordIdForMember(memberId: string): Promise<string> {
        const m = await this.prisma.member.findUnique({
            where: { id: memberId },
            select: { entityRecordId: true },
        });
        if (!m) {
            throw new NotFoundException(`Member ${memberId} not found`);
        }
        return m.entityRecordId;
    }

    async create(data: {
        memberId: string;
        documentId: string;
        number: string;
        issuedAt?: Date;
        expiresAt?: Date;
        issuedBy?: string;
    }): Promise<MemberDocumentWithDocument> {
        const entityRecordId = await this.entityRecordIdForMember(data.memberId);
        return this.prisma.memberDocument.create({
            data: {
                entityRecordId,
                documentId: data.documentId,
                number: data.number,
                issuedAt: data.issuedAt,
                expiresAt: data.expiresAt,
                issuedBy: data.issuedBy,
            },
            include: { document: true },
        });
    }

    async findByMemberId(memberId: string): Promise<MemberDocumentWithDocument[]> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.memberDocument.findMany({
            where: { entityRecordId },
            include: { document: true },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.memberDocument.deleteMany({
            where: { entityRecordId },
        });
    }
}
