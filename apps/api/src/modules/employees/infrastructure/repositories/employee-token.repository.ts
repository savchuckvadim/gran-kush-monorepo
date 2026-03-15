import { Injectable } from "@nestjs/common";

import { EmployeeTokenRepository } from "@employees/domain/repositories/employee-token-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class EmployeeTokenPrismaRepository implements EmployeeTokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: { token: string; employeeId: string; expiresAt: Date }) {
        return this.prisma.employeeToken.create({
            data,
        });
    }

    async findByToken(token: string) {
        return this.prisma.employeeToken.findUnique({
            where: { token },
            include: { employee: { include: { user: true } } },
        });
    }

    async findByEmployeeId(employeeId: string) {
        return this.prisma.employeeToken.findMany({
            where: { employeeId },
        });
    }

    async deleteByToken(token: string) {
        return this.prisma.employeeToken.deleteMany({
            where: { token },
        });
    }

    async deleteByEmployeeId(employeeId: string) {
        return this.prisma.employeeToken.deleteMany({
            where: { employeeId },
        });
    }

    async deleteExpired() {
        return this.prisma.employeeToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
}
