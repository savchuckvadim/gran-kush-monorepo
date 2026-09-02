import { Injectable } from "@nestjs/common";

import { Prisma, UserDocument, UserDocumentSide } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";

@Injectable()
export class UserDocumentPrismaRepository implements UserDocumentRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAllByUser(userId: string): Promise<UserDocument[]> {
        return this.prisma.userDocument.findMany({
            where: { userId },
            orderBy: [{ type: "asc" }, { side: "asc" }],
        });
    }

    async countByUser(userId: string): Promise<number> {
        return this.prisma.userDocument.count({ where: { userId } });
    }

    async findById(id: string): Promise<UserDocument | null> {
        return this.prisma.userDocument.findUnique({ where: { id } });
    }

    async findByUserTypeSide(
        userId: string,
        type: string,
        side: UserDocumentSide
    ): Promise<UserDocument | null> {
        return this.prisma.userDocument.findUnique({
            where: { userId_type_side: { userId, type, side } },
        });
    }

    async upsertByUserTypeSide(data: {
        userId: string;
        type: string;
        side: UserDocumentSide;
        storagePath: string;
        number?: string | null;
        meta?: Prisma.InputJsonValue | null;
    }): Promise<UserDocument> {
        const update: Prisma.UserDocumentUpdateInput = {
            storagePath: data.storagePath,
            ...(data.number !== undefined ? { number: data.number } : {}),
            ...(data.meta !== undefined && data.meta !== null ? { meta: data.meta } : {}),
        };
        return this.prisma.userDocument.upsert({
            where: {
                userId_type_side: { userId: data.userId, type: data.type, side: data.side },
            },
            update,
            create: {
                userId: data.userId,
                type: data.type,
                side: data.side,
                storagePath: data.storagePath,
                number: data.number ?? null,
                ...(data.meta !== undefined && data.meta !== null ? { meta: data.meta } : {}),
            },
        });
    }

    async deleteById(id: string): Promise<void> {
        await this.prisma.userDocument.delete({ where: { id } });
    }
}
