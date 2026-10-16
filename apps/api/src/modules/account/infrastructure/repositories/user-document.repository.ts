import { Injectable } from "@nestjs/common";

import { Prisma, UserDocument, UserDocumentSide } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import { DocumentNumberCipher } from "@modules/account/application/services/document-number.cipher";
import { UserDocumentRepository } from "@modules/account/domain/repositories/user-document-repository.interface";

@Injectable()
export class UserDocumentPrismaRepository implements UserDocumentRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cipher: DocumentNumberCipher
    ) {}

    async findAllByUser(userId: string): Promise<UserDocument[]> {
        // distinct по слоту при сортировке по версии «вниз» оставляет текущую версию каждого слота
        const rows = await this.prisma.userDocument.findMany({
            where: { userId },
            orderBy: [{ type: "asc" }, { side: "asc" }, { version: "desc" }],
            distinct: ["type", "side"],
        });
        return rows.map((row) => this.open(row));
    }

    async countByUser(userId: string): Promise<number> {
        const slots = await this.prisma.userDocument.groupBy({
            by: ["type", "side"],
            where: { userId },
        });
        return slots.length;
    }

    async findById(id: string): Promise<UserDocument | null> {
        const row = await this.prisma.userDocument.findUnique({ where: { id } });
        return row ? this.open(row) : null;
    }

    async findByIds(ids: string[]): Promise<UserDocument[]> {
        if (ids.length === 0) {
            return [];
        }
        const rows = await this.prisma.userDocument.findMany({ where: { id: { in: ids } } });
        return rows.map((row) => this.open(row));
    }

    async findByUserTypeSide(
        userId: string,
        type: string,
        side: UserDocumentSide
    ): Promise<UserDocument | null> {
        const row = await this.prisma.userDocument.findFirst({
            where: { userId, type, side },
            orderBy: { version: "desc" },
        });
        return row ? this.open(row) : null;
    }

    async findVersions(
        userId: string,
        type: string,
        side: UserDocumentSide
    ): Promise<UserDocument[]> {
        const rows = await this.prisma.userDocument.findMany({
            where: { userId, type, side },
            orderBy: { version: "desc" },
        });
        return rows.map((row) => this.open(row));
    }

    async create(data: {
        userId: string;
        type: string;
        side: UserDocumentSide;
        version: number;
        storagePath: string;
        number?: string | null;
        meta?: Prisma.InputJsonValue | null;
    }): Promise<UserDocument> {
        const row = await this.prisma.userDocument.create({
            data: {
                userId: data.userId,
                type: data.type,
                side: data.side,
                version: data.version,
                storagePath: data.storagePath,
                number: this.cipher.seal(data.number),
                ...(data.meta !== undefined && data.meta !== null ? { meta: data.meta } : {}),
            },
        });
        return this.open(row);
    }

    async updateFile(
        id: string,
        data: { storagePath: string; number?: string | null }
    ): Promise<UserDocument> {
        const row = await this.prisma.userDocument.update({
            where: { id },
            data: {
                storagePath: data.storagePath,
                ...(data.number !== undefined ? { number: this.cipher.seal(data.number) } : {}),
            },
        });
        return this.open(row);
    }

    async findSupersededWithoutShares(userId: string): Promise<UserDocument[]> {
        const all = await this.prisma.userDocument.findMany({
            where: { userId },
            include: { _count: { select: { shares: true } } },
        });
        const currentVersion = new Map<string, number>();
        for (const row of all) {
            const slot = `${row.type}:${row.side}`;
            currentVersion.set(slot, Math.max(currentVersion.get(slot) ?? 0, row.version));
        }
        return all
            .filter(
                (row) =>
                    row.version < (currentVersion.get(`${row.type}:${row.side}`) ?? row.version) &&
                    row._count.shares === 0
            )
            .map((row) => this.open(row));
    }

    async deleteById(id: string): Promise<void> {
        await this.prisma.userDocument.delete({ where: { id } });
    }

    async sealLegacyNumbers(): Promise<number> {
        const legacy = await this.prisma.userDocument.findMany({
            where: { number: { not: null }, NOT: { number: { startsWith: "enc1:" } } },
            select: { id: true, number: true },
        });
        let sealed = 0;
        for (const row of legacy) {
            // Условие по прежнему значению: параллельный запуск на другой реплике не зашифрует
            // номер второй раз
            const result = await this.prisma.userDocument.updateMany({
                where: { id: row.id, number: row.number },
                data: { number: this.cipher.seal(row.number) },
            });
            sealed += result.count;
        }
        return sealed;
    }

    private open(row: UserDocument): UserDocument {
        return { ...row, number: this.cipher.open(row.number) };
    }
}
