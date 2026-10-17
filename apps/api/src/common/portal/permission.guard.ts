import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import type { Request } from "express";

import { REQUIRED_PERMISSIONS_KEY } from "@common/decorators/auth/require-permission.decorator";
import type { Permission } from "@modules/portal/crm/access/domain/permissions";

import { principalCan } from "./portal-principal.types";

/**
 * Права роли сотрудника (TASK-731). Стоит в цепочке `RequireEmployeeJwt` после `MembershipGuard`, поэтому
 * principal уже есть. Права из `@RequirePermission` на классе и на обработчике складываются: нужны все.
 * Маршрут без `@RequirePermission` открыт любому сотруднику клуба.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndMerge<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
            context.getClass(),
            context.getHandler(),
        ]);
        if (required.length === 0) {
            return true;
        }
        const principal = context.switchToHttp().getRequest<Request>().principal;
        if (!principal || !principalCan(principal, ...required)) {
            throw new ForbiddenException({
                message: "Not enough permissions",
                code: "missing_permission",
                errors: required,
            });
        }
        return true;
    }
}
