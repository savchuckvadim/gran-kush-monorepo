import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { CabinetAuth } from "@modules/portal/auth/sessions/api/session-auth.decorators";
import { Member } from "@modules/portal/crm/members/domain/entity/member.entity";

/**
 * Декоратор для получения текущего Member из запроса
 * Используется вместе с @CabinetAuth() из @auth/members
 */
export const CurrentMember = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Member => {
        const request = ctx.switchToHttp().getRequest<{ user: Member }>();
        return request.user;
    }
);
