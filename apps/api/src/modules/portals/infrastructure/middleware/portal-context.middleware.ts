import {
    BadRequestException,
    Injectable,
    NestMiddleware,
    UnauthorizedException,
} from "@nestjs/common";

import { NextFunction, Request, Response } from "express";

import { PORTAL_HTTP_HEADERS } from "@common/portal/portal-http.constants";
import { PortalResolutionService } from "@modules/portals/application/services/portal-resolution.service";

@Injectable()
export class PortalContextMiddleware implements NestMiddleware {
    constructor(private readonly portalResolution: PortalResolutionService) {}

    async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
        const path = this.normalizePath(req.path);

        if (!this.requiresPortalContext(path)) {
            return next();
        }

        const rawId = req.headers[PORTAL_HTTP_HEADERS.PORTAL_ID];
        const rawSlug = req.headers[PORTAL_HTTP_HEADERS.PORTAL_SLUG];
        const portalId = typeof rawId === "string" ? rawId.trim() : undefined;
        const slug =
            typeof rawSlug === "string"
                ? rawSlug.trim()
                : Array.isArray(rawSlug)
                  ? rawSlug[0]?.trim()
                  : undefined;

        if (!portalId && !slug) {
            return next(
                new BadRequestException(
                    `Missing portal: send ${PORTAL_HTTP_HEADERS.PORTAL_ID} or ${PORTAL_HTTP_HEADERS.PORTAL_SLUG}`
                )
            );
        }

        try {
            const portal = await this.portalResolution.findActiveByIdOrSlug(portalId, slug);
            if (!portal) {
                throw new UnauthorizedException("Invalid portal");
            }
            req.portalContext = {
                portalId: portal.id,
                slug: portal.name,
                displayName: portal.displayName,
            };
            next();
        } catch (e) {
            next(e);
        }
    }

    private normalizePath(path: string): string {
        if (!path.startsWith("/")) {
            return `/${path}`;
        }
        return path;
    }

    /** Маршруты, где обязателен tenant (как в MULTITENANT_* playbook). */
    private requiresPortalContext(path: string): boolean {
        if (path.startsWith("/platform/")) {
            return false;
        }
        if (path.startsWith("/docs")) {
            return false;
        }
        if (path.startsWith("/test")) {
            return false;
        }
        if (path.startsWith("/mail")) {
            return false;
        }
        if (path.startsWith("/auth")) {
            return false;
        }
        return path.startsWith("/crm/") || path.startsWith("/lk/") || path.startsWith("/users/");
    }
}
