import { Injectable, NotFoundException } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    buildMemberFieldMap,
    getMemberDisplayNameParts,
} from "@modules/portal/crm/entity-fields/lib/member-field-values";
import { QrCode } from "@modules/portal/crm/qr-codes/domain/entity/qr-code.entity";
import { QrCodeRepository } from "@modules/portal/crm/qr-codes/domain/repositories/qr-code-repository.interface";
import { QR_CODE_INCLUDE } from "@modules/portal/crm/qr-codes/infrastructure/prisma-includes";

type QrCodeRow = Prisma.QrCodeGetPayload<{
    include: typeof QR_CODE_INCLUDE;
}>;

@Injectable()
export class QrCodePrismaRepository extends QrCodeRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

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

    async findById(id: string): Promise<QrCode | null> {
        const row = await this.prisma.qrCode.findUnique({
            where: { id },
            include: QR_CODE_INCLUDE,
        });
        return row ? this.mapToEntity(row) : null;
    }

    async findByMemberId(memberId: string): Promise<QrCode | null> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        const row = await this.prisma.qrCode.findUnique({
            where: { entityRecordId },
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
        const entityRecordId = await this.entityRecordIdForMember(data.memberId);
        const row = await this.prisma.qrCode.create({
            data: {
                entityRecordId,
                encryptedCode: data.encryptedCode,
                expiresAt: data.expiresAt,
            },
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
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        await this.prisma.qrCode.deleteMany({ where: { entityRecordId } });
    }

    async findExpired(): Promise<QrCode[]> {
        const rows = await this.prisma.qrCode.findMany({
            where: { expiresAt: { lt: new Date() } },
            include: QR_CODE_INCLUDE,
        });
        return rows.map((row) => this.mapToEntity(row));
    }

    private mapToEntity(row: QrCodeRow): QrCode {
        const er = row.entityRecord;
        const rawMember = er?.member;
        let memberPayload: QrCode["member"] = undefined;
        if (rawMember && er) {
            if (er.fieldValues?.length) {
                const fieldMap = buildMemberFieldMap(
                    er.fieldValues.map((fv) => ({
                        valueJson: fv.valueJson,
                        fieldDefinition: fv.fieldDefinition,
                    }))
                );
                const { firstName, lastName } = getMemberDisplayNameParts(fieldMap);
                memberPayload = {
                    id: rawMember.id,
                    name: firstName,
                    surname: lastName,
                    membershipNumber: rawMember.membershipNumber,
                    isActive: rawMember.isActive,
                };
            } else {
                memberPayload = {
                    id: rawMember.id,
                    name: "",
                    surname: "",
                    membershipNumber: rawMember.membershipNumber,
                    isActive: rawMember.isActive,
                };
            }
        }

        return new QrCode({
            id: row.id,
            memberId: rawMember?.id ?? row.entityRecordId,
            encryptedCode: row.encryptedCode,
            expiresAt: row.expiresAt,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            member: memberPayload,
        });
    }
}
