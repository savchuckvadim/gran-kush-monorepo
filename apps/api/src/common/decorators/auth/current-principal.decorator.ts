import { createParamDecorator, ExecutionContext, ForbiddenException } from "@nestjs/common";

import type { Request } from "express";

import { PortalPrincipal } from "@common/portal/portal-principal.types";

/** Резолвнутый membership текущего запроса (после MembershipGuard). */
export const CurrentPrincipal = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): PortalPrincipal => {
        const request = ctx.switchToHttp().getRequest<Request>();
        if (!request.principal) {
            throw new ForbiddenException("Portal membership is required");
        }
        return request.principal;
    }
);
