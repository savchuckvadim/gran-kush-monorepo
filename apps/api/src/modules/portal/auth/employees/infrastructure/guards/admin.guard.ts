import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

import { EmployeeRole } from "@prisma/client";
import { Request } from "express";

import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

type RequestWithEmployeeUser = Request & { user?: Employee };

const ADMIN_ROLES: readonly EmployeeRole[] = [EmployeeRole.admin, EmployeeRole.portal_owner];

/**
 * Требует роль admin/portal_owner у Employee-моста текущего портала.
 * Должен идти после MembershipGuard (req.user = Employee bridge).
 *
 * Fail-closed: если гвард навешен, роль проверяется всегда. Раньше при отсутствии
 * метаданных @Admin() гвард молча пропускал всех — из-за чего write-эндпоинты
 * каталога и финансов были открыты любому сотруднику. Предпочитай @RequireAdmin(),
 * который навешивает гвард и метаданные вместе.
 */
@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<RequestWithEmployeeUser>();
        const employee = request.user;

        if (!employee?.role || !ADMIN_ROLES.includes(employee.role)) {
            throw new ForbiddenException("Admin role required");
        }

        return true;
    }
}
