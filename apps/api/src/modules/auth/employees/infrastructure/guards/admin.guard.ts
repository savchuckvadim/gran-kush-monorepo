import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { Employee } from "@employees/domain/entity/employee.entity";

import { ADMIN_KEY } from "@common/decorators/auth/admin.decorator";

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(private reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // Проверяем, требуется ли роль admin
        const isAdminRequired = this.reflector.getAllAndOverride<boolean>(ADMIN_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!isAdminRequired) {
            return true; // Если роль admin не требуется, просто пропускаем
        }

        // Получаем Employee из запроса (должен быть установлен JWT-guard сотрудника)
        const request = context.switchToHttp().getRequest();
        const employee: Employee = request.user;

        if (!employee || employee.role !== "admin") {
            throw new ForbiddenException("Admin role required");
        }

        return true;
    }
}
