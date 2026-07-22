import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { EmployeeRole } from "@prisma/client";
import { Request } from "express";

import { ADMIN_KEY } from "@common/decorators/auth/admin.decorator";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

type RequestWithEmployeeUser = Request & { user?: Employee };

const ADMIN_ROLES: readonly EmployeeRole[] = [EmployeeRole.admin, EmployeeRole.portal_owner];

/**
 * Требует роль admin/portal_owner у Employee-моста текущего портала.
 * Должен идти после MembershipGuard (req.user = Employee bridge).
 */
@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const isAdminRequired = this.reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!isAdminRequired) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithEmployeeUser>();
        const employee = request.user;

        if (!employee?.role || !ADMIN_ROLES.includes(employee.role)) {
            throw new ForbiddenException("Admin role required");
        }

        return true;
    }
}
