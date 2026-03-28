import { Injectable } from "@nestjs/common";

import { EmployeeTokenRepository } from "@employees/domain/repositories/employee-token-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class EmployeeTokenPrismaRepository implements EmployeeTokenRepository {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: {
        token: string;
        employeeId: string;
        deviceId: string;
        portalId?: string;
        expiresAt: Date;
    }) {
        return this.prisma.employeeToken.create({
            data,
            select: { id: true },
        });
    }

    async findActiveByToken(token: string) {
        return this.prisma.employeeToken.findFirst({
            where: {
                token,
                revoked: false,
                expiresAt: { gt: new Date() },
            },
            include: {
                employee: {
                    include: { user: true },
                },
            },
        });
    }

    async revokeById(id: string): Promise<void> {
        await this.prisma.employeeToken.update({
            where: { id },
            data: { revoked: true },
        });
    }

    async revokeAllActiveForEmployeeDevice(employeeId: string, deviceId: string): Promise<void> {
        await this.prisma.employeeToken.updateMany({
            where: {
                employeeId,
                deviceId,
                revoked: false,
            },
            data: { revoked: true },
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
