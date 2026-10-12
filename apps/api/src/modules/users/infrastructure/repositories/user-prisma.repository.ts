import { Injectable } from "@nestjs/common";

import { Prisma, UserAccountStatus } from "@prisma/client";
import { User, UserWithMemberships } from "@users/domain/entity/user.entity";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

const userWithMembershipsInclude = {
    employees: true,
    members: true,
} as const satisfies Prisma.UserInclude;

type UserWithMembershipsRow = Prisma.UserGetPayload<{
    include: typeof userWithMembershipsInclude;
}>;

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

    async findByEmailWithMemberships(email: string): Promise<UserWithMemberships | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: userWithMembershipsInclude,
        });
        return user ? this.mapToEntityWithMemberships(user) : null;
    }

    async findByIdWithMemberships(id: string): Promise<UserWithMemberships | null> {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: userWithMembershipsInclude,
        });
        return user ? this.mapToEntityWithMemberships(user) : null;
    }

    async existsByEmail(email: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        return !!user;
    }

    async create(data: {
        email: string;
        passwordHash: string | null;
        status?: UserAccountStatus;
        displayName?: string;
        isActive?: boolean;
        emailConfirmed?: boolean;
    }): Promise<User> {
        const user = await this.prisma.user.create({
            data: {
                email: data.email.toLowerCase(),
                passwordHash: data.passwordHash,
                status: data.status ?? UserAccountStatus.active,
                displayName: data.displayName,
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                ...(data.emailConfirmed !== undefined
                    ? { emailConfirmed: data.emailConfirmed }
                    : {}),
            },
        });
        return this.mapToEntity(user);
    }

    async update(
        id: string,
        data: Partial<{
            passwordHash: string;
            status: UserAccountStatus;
            displayName: string | null;
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

    private mapToEntityWithMemberships(user: UserWithMembershipsRow): UserWithMemberships {
        const base = this.mapToEntity(user);
        const withMemberships = new UserWithMemberships(base);
        withMemberships.employees = user.employees.map(
            (e) =>
                new Employee({
                    id: e.id,
                    userId: e.userId,
                    portalId: e.portalId,
                    entityRecordId: e.entityRecordId,
                    email: user.email,
                    role: e.role,
                    isActive: e.isActive,
                    lastLoginAt: e.lastLoginAt ?? undefined,
                    createdAt: e.createdAt,
                    updatedAt: e.updatedAt,
                })
        );
        withMemberships.members = user.members.map(
            (m) =>
                new Member({
                    id: m.id,
                    userId: m.userId,
                    portalId: m.portalId,
                    entityRecordId: m.entityRecordId,
                    membershipNumber: m.membershipNumber ?? undefined,
                    isActive: m.isActive,
                    joinSource: m.joinSource,
                    claimedAt: m.claimedAt ?? undefined,
                    createdAt: m.createdAt,
                    updatedAt: m.updatedAt,
                })
        );
        return withMemberships;
    }

    private mapToEntity(user: {
        id: string;
        email: string;
        passwordHash: string | null;
        status: UserAccountStatus;
        displayName: string | null;
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
            email: user.email,
            passwordHash: user.passwordHash,
            status: user.status,
            displayName: user.displayName ?? undefined,
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
