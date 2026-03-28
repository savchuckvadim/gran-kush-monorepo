import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { User } from "@users/domain/entity/user.entity";
import { Request } from "express";

interface RequestWithUser extends Request {
    user?: User;
}

/**
 * Декоратор для получения текущего пользователя из request
 * Устаревший декоратор; для CRM/ЛК используйте CurrentEmployee / CurrentMember
 *
 * @example
 * ```typescript
 * @Get('me')
 * @UseGuards(...)
 * async getMe(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 *
 * @example
 * ```typescript
 * @Get('me')
 * @UseGuards(...)
 * async getMe(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
    <K extends keyof User>(data: K | undefined, ctx: ExecutionContext): User | User[K] | null => {
        const request = ctx.switchToHttp().getRequest<RequestWithUser>();
        const user = request.user;

        if (!user) {
            return null;
        }

        // Если передан параметр, возвращаем конкретное поле
        if (data) {
            return user[data];
        }
        return user;
    }
);
