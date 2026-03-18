import { Injectable } from "@nestjs/common";

import { QrCode } from "@qr-codes/domain/entity/qr-code.entity";
import { QrCodeRepository } from "@qr-codes/domain/repositories/qr-code-repository.interface";
import { QR_CODE_INCLUDE } from "@qr-codes/infrastructure/prisma-includes";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class QrCodePrismaRepository extends QrCodeRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async findById(id: string): Promise<QrCode | null> {
        const row = await this.prisma.qrCode.findUnique({
            where: { id },
            include: QR_CODE_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    async findByMemberId(memberId: string): Promise<QrCode | null> {
        const row = await this.prisma.qrCode.findUnique({
            where: { memberId },
            include: QR_CODE_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    async findByEncryptedCode(encryptedCode: string): Promise<QrCode | null> {
        const row = await this.prisma.qrCode.findFirst({
            where: { encryptedCode },
            include: QR_CODE_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    async create(data: {
        memberId: string;
        encryptedCode: string;
        expiresAt: Date;
    }): Promise<QrCode> {
        const row = await this.prisma.qrCode.create({
            data,
            include: QR_CODE_INCLUDE,
        });
        return this.mapToEntity(row);
    }

    async update(id: string, data: { encryptedCode: string; expiresAt: Date }): Promise<QrCode> {
        const row = await this.prisma.qrCode.update({
            where: { id },
            data,
            include: QR_CODE_INCLUDE,
        });
        return this.mapToEntity(row);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.qrCode.delete({ where: { id } });
    }

    async deleteByMemberId(memberId: string): Promise<void> {
        await this.prisma.qrCode.deleteMany({ where: { memberId } });
    }

    async findExpired(): Promise<QrCode[]> {
        const rows = await this.prisma.qrCode.findMany({
            where: { expiresAt: { lt: new Date() } },
            include: QR_CODE_INCLUDE,
        });
        return rows.map((row) => this.mapToEntity(row));
    }

    // ─── Маппинг ─────────────────────────────────────────────────────────────

    private mapToEntity(row: any): QrCode {
        return new QrCode({
            id: row.id,
            memberId: row.memberId,
            encryptedCode: row.encryptedCode,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            member: row.member ?? undefined,
        });
    }
}
