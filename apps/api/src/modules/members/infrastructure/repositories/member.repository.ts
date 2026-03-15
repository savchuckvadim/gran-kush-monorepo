import { Injectable } from "@nestjs/common";

import {
    MemberWithRelations,
    memberWithRelationsInclude,
} from "@members/domain/entity/member.entity";
import { MemberRepository } from "@members/domain/repositories/member-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class MemberPrismaRepository implements MemberRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(limit: number = 100): Promise<MemberWithRelations[]> {
        return this.prisma.member.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            include: memberWithRelationsInclude,
        });
    }

    async findById(id: string): Promise<MemberWithRelations | null> {
        return this.prisma.member.findUnique({
            where: { id },
            include: memberWithRelationsInclude,
        });
    }

    async findByUserId(userId: string): Promise<MemberWithRelations | null> {
        return this.prisma.member.findUnique({
            where: { userId },
            include: memberWithRelationsInclude,
        });
    }

    async create(data: {
        userId: string;
        name: string;
        surname?: string;
        phone?: string;
        birthday?: Date;
        membershipNumber?: string;
        address?: string;
        status?: string;
        notes?: string;
    }): Promise<MemberWithRelations> {
        return this.prisma.member.create({
            data,
            include: memberWithRelationsInclude,
        });
    }

    async update(
        id: string,
        data: Partial<{
            name: string;
            surname: string;
            phone: string;
            birthday: Date;
            membershipNumber: string;
            address: string;
            status: string;
            notes: string;
            isActive: boolean;
        }>
    ): Promise<MemberWithRelations> {
        return this.prisma.member.update({
            where: { id },
            data,
            include: memberWithRelationsInclude,
        });
    }
}
