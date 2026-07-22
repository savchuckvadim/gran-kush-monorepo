import {
    BadRequestException,
    Injectable,
    NestMiddleware,
    UnauthorizedException,
} from "@nestjs/common";

import { NextFunction, Request, Response } from "express";

import { PORTAL_HTTP_HEADERS } from "@common/portal/portal-http.constants";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

@Injectable()
export class PortalContextMiddleware implements NestMiddleware {
    constructor(private readonly portalResolution: PortalResolutionService) {}

    async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
        // req.path внутри смонтированного middleware обрезан до mount point ("/"),
        // поэтому используем originalUrl
        const path = this.normalizePath(req.originalUrl.split("?")[0]);

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
            if (this.portalContextOptional(path)) {
                return next();
            }
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

    /** Маршруты, где middleware вообще участвует (резолвит контекст при наличии заголовков). */
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
        return (
            path.startsWith("/crm/") ||
            path.startsWith("/lk/") ||
            path.startsWith("/users/") ||
            path.startsWith("/public/")
        );
    }

    /**
     * Глобальные маршруты: заголовки X-Portal-* необязательны
     * (auth, аккаунт, «мои клубы/порталы», кросс-клубные экраны).
     */
    private portalContextOptional(path: string): boolean {
        const optionalPrefixes = [
            "/crm/my-portals",
            "/crm/auth/login",
            "/crm/auth/refresh",
            "/crm/auth/logout",
            "/crm/auth/me",
            "/crm/mobile/auth",
            "/lk/auth",
            "/lk/mobile/auth",
            "/lk/account",
            "/lk/portals",
            "/lk/spending",
            "/lk/reviews",
            "/users/",
            "/public/",
        ];
        return optionalPrefixes.some((prefix) => path.startsWith(prefix));
    }
}
