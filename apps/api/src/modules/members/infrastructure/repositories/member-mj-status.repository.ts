import { Injectable } from "@nestjs/common";

import {
    MemberMjStatusRepository,
    MemberMjStatusWithStatus,
} from "@members/domain/repositories/member-mj-status-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class MemberMjStatusPrismaRepository implements MemberMjStatusRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: {
        memberId: string;
        mjStatusId: string;
    }): Promise<MemberMjStatusWithStatus> {
        return this.prisma.memberMjStatus.create({
            data,
            include: { mjStatus: true },
        });
    }

    async deleteByMemberId(memberId: string): Promise<{ count: number }> {
        return this.prisma.memberMjStatus.deleteMany({
            where: { memberId },
        });
    }

    async findByMemberId(memberId: string): Promise<MemberMjStatusWithStatus[]> {
        return this.prisma.memberMjStatus.findMany({
            where: { memberId },
            include: { mjStatus: true },
        });
    }
}
