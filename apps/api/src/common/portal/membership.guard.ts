import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import type { Request } from "express";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    AuthenticatedUser,
    isAuthenticatedUser,
} from "@modules/portal/auth/shared/domain/auth-user";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

import { PortalPrincipal } from "./portal-principal.types";

/**
 * После JWT: резолвит membership глобального user в портале запроса.
 * - member → строка Member(userId, portalId), employee → Employee(userId, portalId);
 * - нет membership или он неактивен → 403;
 * - req.principal = PortalPrincipal, req.user заменяется bridge-сущностью
 *   (совместимость с @CurrentMember/@CurrentEmployee), исходный user → req.authUser.
 * Публичные маршруты (без req.user) пропускает.
 */
@Injectable()
export class MembershipGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<Request>();
        const user = req.user;
        if (!user) {
            return true;
        }
        if (!isAuthenticatedUser(user)) {
            // req.user уже заменён bridge-сущностью (guard отработал раньше в цепочке)
            return true;
        }

        const pc = req.portalContext;
        if (!pc) {
            throw new ForbiddenException(
                "Portal context is required (X-Portal-Id or X-Portal-Slug)"
            );
        }

        if (user.principalType === "member") {
            const member = await this.resolveMember(user, pc.portalId);
            req.authUser = user;
            req.user = member;
            req.principal = this.buildPrincipal(user, pc.portalId, {
                membershipId: member.id,
                entityRecordId: member.entityRecordId,
            });
            return true;
        }

        const employee = await this.resolveEmployee(user, pc.portalId);
        req.authUser = user;
        req.user = employee;
        req.principal = this.buildPrincipal(user, pc.portalId, {
            membershipId: employee.id,
            entityRecordId: employee.entityRecordId,
            role: employee.role,
        });
        return true;
    }

    private async resolveMember(user: AuthenticatedUser, portalId: string): Promise<Member> {
        const member = await this.prisma.member.findUnique({
            where: { userId_portalId: { userId: user.userId, portalId } },
        });
        if (!member || !member.isActive) {
            throw new ForbiddenException("No active membership in this portal");
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
    }

    private async resolveEmployee(user: AuthenticatedUser, portalId: string): Promise<Employee> {
        const employee = await this.prisma.employee.findUnique({
            where: { userId_portalId: { userId: user.userId, portalId } },
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
            role: employee.role,
            isActive: employee.isActive,
            lastLoginAt: employee.lastLoginAt ?? undefined,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt,
        });
    }

    private buildPrincipal(
        user: AuthenticatedUser,
        portalId: string,
        membership: Pick<PortalPrincipal, "membershipId" | "entityRecordId" | "role">
    ): PortalPrincipal {
        return {
            userId: user.userId,
            email: user.email,
            portalId,
            principalType: user.principalType,
            ...membership,
        };
    }
}
