import { Injectable } from "@nestjs/common";

import { SignatureRepository } from "@members/domain/repositories/signature-repository.interface";
import { Signature } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class SignaturePrismaRepository implements SignatureRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: { memberId: string; storagePath: string }): Promise<Signature> {
        return this.prisma.signature.create({
            data,
        });
    }

    async findByMemberId(memberId: string): Promise<Signature | null> {
        return this.prisma.signature.findUnique({
            where: { memberId },
        });
    }

    async updateByMemberId(memberId: string, data: { storagePath: string }): Promise<Signature> {
        return this.prisma.signature.update({
            where: { memberId },
            data,
        });
    }

    async upsertByMemberId(memberId: string, data: { storagePath: string }): Promise<Signature> {
        return this.prisma.signature.upsert({
            where: { memberId },
            update: data,
            create: {
                memberId,
                storagePath: data.storagePath,
            },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        return this.prisma.signature.deleteMany({
            where: { memberId },
        });
    }
}
