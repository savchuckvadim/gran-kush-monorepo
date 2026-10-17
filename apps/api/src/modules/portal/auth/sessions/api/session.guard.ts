import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

import type { Request } from "express";

import { SessionsService } from "../application/sessions.service";
import { SESSION_AUDIENCES, type SessionAudience } from "../domain/auth-session";

import { SessionCookiesService } from "./session-cookies.service";

const BEARER_PREFIX = "Bearer ";

/**
 * Сессия аудитории: access-токен из куки (веб) или `Authorization: Bearer` (мобильные) — один гвард
 * на оба транспорта. Проверяет подпись, сессию и аккаунт; кладёт аккаунт в `req.user`.
 *
 * `@Injectable` на базовом классе обязателен: без него TypeScript не пишет типы параметров
 * конструктора, и наследники получают `undefined` вместо сервисов.
 */
@Injectable()
abstract class SessionGuard implements CanActivate {
    protected abstract readonly audience: SessionAudience;

    constructor(
        private readonly sessions: SessionsService,
        private readonly cookies: SessionCookiesService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = this.bearer(request) ?? this.cookies.readAccess(request, this.audience);
        if (!token) {
            throw new UnauthorizedException("Authentication required");
        }
        const user = await this.sessions.authenticate(token, this.audience);
        if (!user) {
            throw new UnauthorizedException("Session is not valid");
        }
        request.user = user;
        return true;
    }

    private bearer(request: Request): string | null {
        const header = request.headers.authorization;
        return header?.startsWith(BEARER_PREFIX) ? header.slice(BEARER_PREFIX.length) : null;
    }
}

@Injectable()
export class CrmSessionGuard extends SessionGuard {
    protected readonly audience = SESSION_AUDIENCES.Crm;
}

@Injectable()
export class CabinetSessionGuard extends SessionGuard {
    protected readonly audience = SESSION_AUDIENCES.Cabinet;
}
