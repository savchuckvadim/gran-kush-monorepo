import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import type { Request } from "express";

import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

/**
 * После JWT: сравнивает portalId сущности с portalId запроса (из {@link PortalRequestContext}).
 * Публичные маршруты без `req.user` и маршруты без `portalContext` пропускает.
 */
@Injectable()
export class PortalTenantMatchGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const pc = req.portalContext;
        if (!pc) {
            return true;
        }
        const user = req.user as Employee | Member | undefined;
        if (!user) {
            return true;
        }
        const entityPortalId = user.portalId ?? null;
        if (!entityPortalId || entityPortalId !== pc.portalId) {
            throw new ForbiddenException("Portal context does not match authenticated principal");
        }
        return true;
    }
}
