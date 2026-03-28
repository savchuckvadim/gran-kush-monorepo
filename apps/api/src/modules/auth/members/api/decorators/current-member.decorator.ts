import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import { Member } from "@members/domain/entity/member.entity";

/**
 * Декоратор для получения текущего Member из запроса
 * Используется вместе с @RequireMemberJwt() (или мобильным Bearer-эквивалентом)
 */
export const CurrentMember = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Member => {
        const request = ctx.switchToHttp().getRequest<{ user: Member }>();
        return request.user;
    }
);
