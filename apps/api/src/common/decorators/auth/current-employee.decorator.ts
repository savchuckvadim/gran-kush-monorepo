import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { CrmAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

/**
 * Декоратор для получения текущего сотрудника из запроса
 * Используется вместе с @CrmAuth() из @auth/employees
 */
export const CurrentEmployee = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Employee => {
        const request = ctx.switchToHttp().getRequest<{ user: Employee }>();
        return request.user;
    }
);
