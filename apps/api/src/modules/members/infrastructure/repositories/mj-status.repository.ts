import { Injectable } from "@nestjs/common";

import { MjStatusRepository } from "@members/domain/repositories/mj-status-repository.interface";
import { MjStatus } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class MjStatusPrismaRepository implements MjStatusRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByCode(code: string): Promise<MjStatus | null> {
        return this.prisma.mjStatus.findUnique({
            where: { code },
        });
    }

    async findAll(): Promise<MjStatus[]> {
        return this.prisma.mjStatus.findMany({
            where: { isActive: true },
            orderBy: { code: "asc" },
        });
    }

    async create(data: { code: string; name: string; description?: string }): Promise<MjStatus> {
        return this.prisma.mjStatus.create({
            data,
        });
    }
}
