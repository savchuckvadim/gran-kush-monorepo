import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { Employee } from "@employees/domain/entity/employee.entity";
import { Member } from "@members/domain/entity/member.entity";
import type { Request } from "express";

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
