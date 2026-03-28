import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { Request } from "express";

import type { PortalRequestContext } from "@common/portal/portal-context.types";

/**
 * Полный контекст портала из запроса (после middleware), может быть undefined вне CRM/LK.
 */
export const CurrentPortalContext = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): PortalRequestContext | undefined => {
        const req = ctx.switchToHttp().getRequest<Request>();
        return req.portalContext;
    }
);
