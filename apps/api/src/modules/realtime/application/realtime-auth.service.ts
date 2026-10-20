import { HttpException, Injectable } from "@nestjs/common";

import { parse as parseCookies } from "cookie";

import { PublicUrlsService } from "@common/config/public-urls/public-urls.service";
import { findActiveEmployee, findActiveMember } from "@common/portal";
import { PrismaService } from "@common/prisma/prisma.service";
import { audienceOrigins } from "@modules/portal/auth/sessions/api/allowed-origins";
import { SESSION_COOKIE_NAMES } from "@modules/portal/auth/sessions/api/session-cookies.service";
import { SessionsService } from "@modules/portal/auth/sessions/application/sessions.service";
import type { SessionAudience } from "@modules/portal/auth/sessions/domain/auth-session";
import { effectivePermissions } from "@modules/portal/crm/access/domain/portal-role";
import { PortalResolutionService } from "@modules/portal/crm/portals/application/services/portal-resolution.service";

import type { RealtimeConnection, RealtimePortalMembership } from "../domain/realtime-connection";
import { REALTIME_ERRORS } from "../realtime.constants";

/** Что приходит в рукопожатии socket.io */
export interface RealtimeHandshake {
    headers: Record<string, string | string[] | undefined>;
    auth: Record<string, unknown>;
}

/** Отказ в соединении; `code` уходит клиенту в `connect_error.message`. */
export class RealtimeRejection extends Error {
    constructor(readonly code: (typeof REALTIME_ERRORS)[keyof typeof REALTIME_ERRORS]) {
        super(code);
    }
}

const header = (headers: RealtimeHandshake["headers"], name: string): string | undefined => {
    const value = headers[name];
    return Array.isArray(value) ? value[0] : value;
};

const stringAuth = (auth: RealtimeHandshake["auth"], key: string): string | undefined => {
    const value = auth[key];
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

/**
 * Рукопожатие realtime по тем же правилам, что HTTP:
 * - сессия — access-токен из `auth.token` (мобильные, Bearer) или из куки аудитории (веб),
 *   проверка `SessionsService.authenticate`: отозванная сессия и заблокированный аккаунт не пройдут;
 * - соединение на куке принимается только с фронта своего приложения (Origin): чужая страница
 *   не откроет сокет с куками человека, страница кабинета — сокет CRM;
 * - клуб — `auth.portal` (slug); членство — как у MembershipGuard: действующий сотрудник или
 *   участник с подтверждённым согласием. Права сотрудника — снимок роли на момент соединения:
 *   смена роли или прав разрывает соединение, и клиент подключается с новыми.
 */
@Injectable()
export class RealtimeAuthService {
    private readonly origins: Record<SessionAudience, Set<string>>;

    constructor(
        private readonly sessions: SessionsService,
        private readonly portals: PortalResolutionService,
        private readonly prisma: PrismaService,
        urls: PublicUrlsService
    ) {
        this.origins = {
            crm: audienceOrigins(urls, "crm"),
            cabinet: audienceOrigins(urls, "cabinet"),
        };
    }

    async authenticate(
        handshake: RealtimeHandshake,
        audience: SessionAudience
    ): Promise<RealtimeConnection> {
        const token = this.tokenOf(handshake, audience);
        const user = token ? await this.sessions.authenticate(token, audience) : null;
        if (!user) throw new RealtimeRejection(REALTIME_ERRORS.unauthorized);

        const slug = stringAuth(handshake.auth, "portal");
        const portal = slug
            ? await this.membershipIn(slug, audience, { userId: user.userId, email: user.email })
            : null;

        return {
            audience,
            userId: user.userId,
            sessionId: user.sessionId,
            expiresAt: user.accessExpiresAt ?? null,
            portal,
        };
    }

    private tokenOf(handshake: RealtimeHandshake, audience: SessionAudience): string | null {
        const bearer = stringAuth(handshake.auth, "token");
        if (bearer) return bearer;

        const cookieHeader = header(handshake.headers, "cookie");
        const cookie = cookieHeader
            ? parseCookies(cookieHeader)[SESSION_COOKIE_NAMES[audience].access]
            : undefined;
        if (!cookie) return null;
        const origin = header(handshake.headers, "origin");
        if (!origin || !this.origins[audience].has(origin)) {
            throw new RealtimeRejection(REALTIME_ERRORS.originNotAllowed);
        }
        return cookie;
    }

    private async membershipIn(
        slug: string,
        audience: SessionAudience,
        user: { userId: string; email: string }
    ): Promise<RealtimePortalMembership> {
        try {
            const portal = await this.portals.findActiveBySlug(slug);
            if (audience === "cabinet") {
                const member = await findActiveMember(this.prisma, user.userId, portal.id);
                return { kind: "member", portalId: portal.id, memberId: member.id };
            }
            const employee = await findActiveEmployee(this.prisma, user, portal.id);
            return {
                kind: "employee",
                portalId: portal.id,
                employeeId: employee.id,
                roleId: employee.roleId,
                permissions: effectivePermissions(employee.role),
            };
        } catch (error) {
            // нет клуба, нет членства, клуб неактивен — для клиента одно и то же
            if (error instanceof HttpException) {
                throw new RealtimeRejection(REALTIME_ERRORS.forbidden);
            }
            throw error;
        }
    }
}
