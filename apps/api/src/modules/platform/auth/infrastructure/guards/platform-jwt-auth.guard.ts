import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import type { Request } from "express";

import { PrismaService } from "@common/prisma/prisma.service";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";

const BEARER_PREFIX = "Bearer ";

/**
 * Маршруты админки платформы: Bearer access живой сессии `platform` и активный `PlatformAdmin`
 * её аккаунта. Зависит только от глобальных сессий и Prisma — модули с админскими маршрутами
 * (биллинг) подключают гвард без всего модуля платформы.
 */
@Injectable()
export class PlatformJwtAuthGuard implements CanActivate {
    constructor(
        private readonly sessions: SessionsService,
        private readonly prisma: PrismaService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
        const header = request.headers.authorization;
        const token = header?.startsWith(BEARER_PREFIX)
            ? header.slice(BEARER_PREFIX.length).trim()
            : "";
        const live = token ? await this.sessions.authenticatePlatform(token) : null;
        const admin = live
            ? await this.prisma.platformAdmin.findUnique({ where: { userId: live.userId } })
            : null;
        if (!admin?.isActive) {
            throw new UnauthorizedException();
        }
        request.user = admin;
        return true;
    }
}
