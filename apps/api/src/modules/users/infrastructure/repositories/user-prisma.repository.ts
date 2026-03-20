import { Injectable } from "@nestjs/common";

import { Employee } from "@employees/domain/entity/employee.entity";
import { Member } from "@members/domain/entity/member.entity";
import { UserWithRelations } from "@users/domain/entity/user.entity";
import { User } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class UserPrismaRepository implements UserRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async findByEmailWithRelations(email: string): Promise<UserWithRelations | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: {
                employee: true,
                member: true,
            },
        });

        if (!user) {
            return null;
        }

        return {
            ...this.mapToEntity(user),
            employee: user.employee
                ? new Employee({
                      id: user.employee.id,
                      userId: user.employee.userId,
                      portalId: user.employee.portalId || undefined,
                      name: user.employee.name,
                      surname: user.employee.surname || undefined,
                      phone: user.employee.phone || undefined,
                      role: user.employee.role,
                      position: user.employee.position || undefined,
                      department: user.employee.department || undefined,
                      isActive: user.employee.isActive,
                      lastLoginAt: user.employee.lastLoginAt || undefined,
                      createdAt: user.employee.createdAt,
                      updatedAt: user.employee.updatedAt,
                  })
                : null,
            member: user.member
                ? new Member({
                      id: user.member.id,
                      userId: user.member.userId,
                      portalId: user.member.portalId || undefined,
                      name: user.member.name,
                      surname: user.member.surname || undefined,
                      phone: user.member.phone || undefined,
                      birthday: user.member.birthday || undefined,
                      membershipNumber: user.member.membershipNumber || undefined,
                      address: user.member.address || undefined,
                      status: user.member.status,
                      notes: user.member.notes || undefined,
                      isActive: user.member.isActive,
                      createdAt: user.member.createdAt,
                      updatedAt: user.member.updatedAt,
                  })
                : null,
        };
    }

    async existsByEmail(email: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return !!user;
    }

    async create(data: { email: string; passwordHash: string; portalId?: string }): Promise<User> {
        const user = await this.prisma.user.create({
            data: {
                portalId: data.portalId,
                email: data.email.toLowerCase(),
                passwordHash: data.passwordHash,
            },
        });
        return this.mapToEntity(user);
    }

    async update(
        id: string,
        data: Partial<{
            portalId: string | null;
            passwordHash: string;
            isActive: boolean;
            emailConfirmed: boolean;
            emailVerificationToken: string | null;
            emailVerificationExpiresAt: Date | null;
            resetPasswordToken: string | null;
            resetPasswordExpiresAt: Date | null;
        }>
    ): Promise<User> {
        const user = await this.prisma.user.update({
            where: { id },
            data,
        });
        return this.mapToEntity(user);
    }

    async findByEmailVerificationToken(token: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { emailVerificationToken: token },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async findByResetPasswordToken(token: string): Promise<User | null> {
        const user = await this.prisma.user.findUnique({
            where: { resetPasswordToken: token },
        });
        return user ? this.mapToEntity(user) : null;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.user.delete({
            where: { id },
        });
    }

    private mapToEntity(user: {
        id: string;
        portalId: string | null;
        email: string;
        passwordHash: string;
        isActive: boolean;
        emailConfirmed: boolean;
        emailVerificationToken: string | null;
        emailVerificationExpiresAt: Date | null;
        resetPasswordToken: string | null;
        resetPasswordExpiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }): User {
        return new User({
            id: user.id,
            portalId: user.portalId || undefined,
            email: user.email,
            passwordHash: user.passwordHash,
            isActive: user.isActive,
            emailConfirmed: user.emailConfirmed,
            emailVerificationToken: user.emailVerificationToken,
            emailVerificationExpiresAt: user.emailVerificationExpiresAt,
            resetPasswordToken: user.resetPasswordToken,
            resetPasswordExpiresAt: user.resetPasswordExpiresAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        });
    }
}
