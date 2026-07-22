import { Injectable } from "@nestjs/common";

import { UserSignature } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { UserSignatureRepository } from "@modules/account/domain/repositories/user-signature-repository.interface";

@Injectable()
export class UserSignaturePrismaRepository implements UserSignatureRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByUser(userId: string): Promise<UserSignature | null> {
        return this.prisma.userSignature.findUnique({ where: { userId } });
    }

    async upsertByUser(data: { userId: string; storagePath: string }): Promise<UserSignature> {
        return this.prisma.userSignature.upsert({
            where: { userId: data.userId },
            update: { storagePath: data.storagePath, signedAt: new Date() },
            create: { userId: data.userId, storagePath: data.storagePath },
        });
    }

    async deleteByUser(userId: string): Promise<void> {
        await this.prisma.userSignature.deleteMany({ where: { userId } });
    }
}
