import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

/**
 * Текущий глобальный аккаунт (результат JWT-стратегии).
 * Для глобальных эндпоинтов без MembershipGuard (req.user = AuthenticatedUser);
 * после MembershipGuard оригинал доступен в req.authUser.
 */
export const CurrentAuthUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const request = ctx
            .switchToHttp()
            .getRequest<{ user?: unknown; authUser?: unknown }>();
        const authUser = request.authUser ?? request.user;
        return authUser as AuthenticatedUser;
    }
);
