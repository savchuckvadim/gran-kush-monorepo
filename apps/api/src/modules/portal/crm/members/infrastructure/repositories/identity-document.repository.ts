import { Injectable, NotFoundException } from "@nestjs/common";

import { IdentityDocument } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { IdentityDocumentRepository } from "@modules/portal/crm/members/domain/repositories/identity-document-repository.interface";

@Injectable()
export class IdentityDocumentPrismaRepository implements IdentityDocumentRepository {
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
        type: string;
        side: string;
        storagePath: string;
    }): Promise<IdentityDocument> {
        const entityRecordId = await this.entityRecordIdForMember(data.memberId);
        return this.prisma.identityDocument.create({
            data: {
                entityRecordId,
                type: data.type,
                side: data.side,
                storagePath: data.storagePath,
            },
        });
    }

    async upsertByMemberTypeAndSide(data: {
        memberId: string;
        type: string;
        side: string;
        storagePath: string;
    }): Promise<IdentityDocument> {
        const entityRecordId = await this.entityRecordIdForMember(data.memberId);
        return this.prisma.identityDocument.upsert({
            where: {
                entityRecordId_type_side: {
                    entityRecordId,
                    type: data.type,
                    side: data.side,
                },
            },
            update: {
                storagePath: data.storagePath,
            },
            create: {
                entityRecordId,
                type: data.type,
                side: data.side,
                storagePath: data.storagePath,
            },
        });
    }

    async findByMemberId(memberId: string): Promise<IdentityDocument[]> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.identityDocument.findMany({
            where: { entityRecordId },
        });
    }

    async findByMemberIdAndType(memberId: string, type: string): Promise<IdentityDocument[]> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.identityDocument.findMany({
            where: { entityRecordId, type },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.identityDocument.deleteMany({
            where: { entityRecordId },
        });
    }

    async deleteByMemberIdAndType(memberId: string, type: string): Promise<{ count: number }> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.identityDocument.deleteMany({
            where: { entityRecordId, type },
        });
    }
}
