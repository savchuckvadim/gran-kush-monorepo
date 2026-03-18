import { Injectable } from "@nestjs/common";

import { IdentityDocumentRepository } from "@members/domain/repositories/identity-document-repository.interface";
import { IdentityDocument } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class IdentityDocumentPrismaRepository implements IdentityDocumentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: {
        memberId: string;
        type: string;
        side: string;
        storagePath: string;
    }): Promise<IdentityDocument> {
        return this.prisma.identityDocument.create({
            data,
        });
    }

    async upsertByMemberTypeAndSide(data: {
        memberId: string;
        type: string;
        side: string;
        storagePath: string;
    }): Promise<IdentityDocument> {
        return this.prisma.identityDocument.upsert({
            where: {
                memberId_type_side: {
                    memberId: data.memberId,
                    type: data.type,
                    side: data.side,
                },
            },
            update: {
                storagePath: data.storagePath,
            },
            create: data,
        });
    }

    async findByMemberId(memberId: string): Promise<IdentityDocument[]> {
        return this.prisma.identityDocument.findMany({
            where: { memberId },
        });
    }

    async findByMemberIdAndType(memberId: string, type: string): Promise<IdentityDocument[]> {
        return this.prisma.identityDocument.findMany({
            where: { memberId, type },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        return this.prisma.identityDocument.deleteMany({
            where: { memberId },
        });
    }

    async deleteByMemberIdAndType(memberId: string, type: string): Promise<{ count: number }> {
        return this.prisma.identityDocument.deleteMany({
            where: { memberId, type },
        });
    }
}
