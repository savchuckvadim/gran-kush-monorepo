import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import type { Request } from "express";

import { PrismaService } from "@common/prisma/prisma.service";
import {
    AuthenticatedUser,
    isAuthenticatedUser,
} from "@modules/portal/auth/shared/domain/auth-user";
import { effectivePermissions } from "@modules/portal/crm/access/domain/portal-role";

import { findActiveEmployee, findActiveMember } from "./portal-membership";
import { PortalPrincipal } from "./portal-principal.types";

/**
 * После JWT: резолвит membership глобального user в портале запроса.
 * - member → строка Member(userId, portalId), employee → Employee(userId, portalId);
 * - нет membership или он неактивен → 403;
 * - членство участника без подтверждённого согласия владельца аккаунта → 403: пока человек не
 *   согласился, клуб — чужой для него (QR, каталог, заказы, документы закрыты, TASK-703);
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
            const member = await findActiveMember(this.prisma, user.userId, pc.portalId);
            req.authUser = user;
            req.user = member;
            req.principal = this.buildPrincipal(user, pc.portalId, {
                membershipId: member.id,
                entityRecordId: member.entityRecordId,
                permissions: [],
            });
            return true;
        }

        const employee = await findActiveEmployee(this.prisma, user, pc.portalId);
        req.authUser = user;
        req.user = employee;
        req.principal = this.buildPrincipal(user, pc.portalId, {
            membershipId: employee.id,
            entityRecordId: employee.entityRecordId,
            roleId: employee.roleId,
            roleKey: employee.role.key,
            permissions: effectivePermissions(employee.role),
        });
        return true;
    }

    private buildPrincipal(
        user: AuthenticatedUser,
        portalId: string,
        membership: Pick<
            PortalPrincipal,
            "membershipId" | "entityRecordId" | "roleId" | "roleKey" | "permissions"
        >
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
