import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { Employee } from "@employees/domain/entity/employee.entity";

/**
 * Декоратор для получения текущего сотрудника из запроса
 * Используется вместе с @RequireEmployeeJwt() из @auth/employees
 */
export const CurrentEmployee = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Employee => {
        const request = ctx.switchToHttp().getRequest<{ user: Employee }>();
        return request.user;
    }
);
