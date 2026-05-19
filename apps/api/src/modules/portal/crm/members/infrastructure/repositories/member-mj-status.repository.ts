import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    MemberMjStatusRepository,
    MemberMjStatusWithStatus,
} from "@modules/portal/crm/members/domain/repositories/member-mj-status-repository.interface";

@Injectable()
export class MemberMjStatusPrismaRepository implements MemberMjStatusRepository {
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
        mjStatusId: string;
    }): Promise<MemberMjStatusWithStatus> {
        const entityRecordId = await this.entityRecordIdForMember(data.memberId);
        return this.prisma.memberMjStatus.create({
            data: {
                entityRecordId,
                mjStatusId: data.mjStatusId,
            },
            include: { mjStatus: true },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.memberMjStatus.deleteMany({
            where: { entityRecordId },
        });
    }

    async findByMemberId(memberId: string): Promise<MemberMjStatusWithStatus[]> {
        const entityRecordId = await this.entityRecordIdForMember(memberId);
        return this.prisma.memberMjStatus.findMany({
            where: { entityRecordId },
            include: { mjStatus: true },
        });
    }
}
