import { Injectable, NotFoundException } from "@nestjs/common";

import { Signature } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { SignatureRepository } from "@modules/portal/crm/members/domain/repositories/signature-repository.interface";

@Injectable()
export class SignaturePrismaRepository implements SignatureRepository {
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

    async create(data: { memberId: string; storagePath: string }): Promise<Signature> {
        const entityRecordId = await this.entityRecordIdForMember(data.memberId);
        return this.prisma.signature.create({
            data: {
                entityRecordId,
                storagePath: data.storagePath,
            },
        });
    }

    async findByMemberId(memberId: string): Promise<Signature | null> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.signature.findUnique({
            where: { entityRecordId },
        });
    }

    async updateByMemberId(memberId: string, data: { storagePath: string }): Promise<Signature> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.signature.update({
            where: { entityRecordId },
            data,
        });
    }

    async upsertByMemberId(memberId: string, data: { storagePath: string }): Promise<Signature> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.signature.upsert({
            where: { entityRecordId },
            update: data,
            create: {
                entityRecordId,
                storagePath: data.storagePath,
            },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.signature.deleteMany({
            where: { entityRecordId },
        });
    }
}
