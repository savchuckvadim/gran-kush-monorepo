import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { EmployeeRole } from "@prisma/client";
import { Request } from "express";

import { EMPLOYEE_ROLES_KEY } from "@common/decorators/auth/employee-roles.decorator";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

type RequestWithEmployeeUser = Request & { user?: Employee };

/**
 * Требует одну из перечисленных в @EmployeeRoles() ролей у Employee-моста текущего портала.
 * Должен идти после MembershipGuard (req.user = Employee bridge).
 */
@Injectable()
export class EmployeeRolesGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const allowedRoles = this.reflector.getAllAndOverride<EmployeeRole[]>(EMPLOYEE_ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!allowedRoles?.length) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithEmployeeUser>();
        const employee = request.user;

        if (!employee?.role || !allowedRoles.includes(employee.role)) {
            throw new ForbiddenException(`Requires one of roles: ${allowedRoles.join(", ")}`);
        }

        return true;
    }
}
