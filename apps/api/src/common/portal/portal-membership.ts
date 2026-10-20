import { ForbiddenException } from "@nestjs/common";

import { MemberConsentStatus } from "@prisma/client";

import type { PrismaService } from "@common/prisma/prisma.service";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

/*
 * Кто аккаунт в клубе — общее правило для HTTP (MembershipGuard) и realtime-шлюза: одно место
 * решает, считается ли человек участником или сотрудником клуба. Нет членства или оно
 * неактивно — 403.
 */

/**
 * Участник клуба. Членство без подтверждённого согласия владельца аккаунта — чужое: пока человек
 * не согласился, QR, каталог, заказы и документы клуба ему закрыты (TASK-703).
 */
export const findActiveMember = async (
    prisma: PrismaService,
    userId: string,
    portalId: string
): Promise<Member> => {
    const member = await prisma.member.findUnique({
        where: { userId_portalId: { userId, portalId } },
    });
    if (!member || !member.isActive) {
        throw new ForbiddenException("No active membership in this portal");
    }
    if (member.consentStatus !== MemberConsentStatus.confirmed) {
        throw new ForbiddenException("Membership is awaiting your confirmation");
    }
    return new Member({
        id: member.id,
        userId: member.userId,
        portalId: member.portalId,
        entityRecordId: member.entityRecordId,
        membershipNumber: member.membershipNumber ?? undefined,
        isActive: member.isActive,
        joinSource: member.joinSource,
        claimedAt: member.claimedAt ?? undefined,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
    });
};

/** Действующий сотрудник клуба вместе с ролью (права — `effectivePermissions(employee.role)`). */
export const findActiveEmployee = async (
    prisma: PrismaService,
    user: { userId: string; email: string },
    portalId: string
): Promise<Employee> => {
    const employee = await prisma.employee.findUnique({
        where: { userId_portalId: { userId: user.userId, portalId } },
        include: { role: true },
    });
    if (!employee || !employee.isActive) {
        throw new ForbiddenException("No active employment in this portal");
    }
    return new Employee({
        id: employee.id,
        userId: employee.userId,
        portalId: employee.portalId,
        entityRecordId: employee.entityRecordId,
        email: user.email,
        roleId: employee.roleId,
        role: {
            id: employee.role.id,
            key: employee.role.key,
            name: employee.role.name,
            isSystem: employee.role.isSystem,
            permissions: employee.role.permissions,
        },
        isActive: employee.isActive,
        lastLoginAt: employee.lastLoginAt ?? undefined,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
    });
};
