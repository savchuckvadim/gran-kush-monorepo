import { BadRequestException, createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { Request } from "express";

/**
 * `portalId` из {@link PortalRequestContext} (обязателен после PortalContextMiddleware).
 */
export const PortalId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const id = req.portalContext?.portalId;
    if (!id) {
        throw new BadRequestException("Portal context is required (X-Portal-Id or X-Portal-Slug)");
    }
    return id;
});
