import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import type { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

import { SessionsService } from "../application/sessions.service";

import type {
    AccountSessionDto,
    AccountSessionsResponseDto,
    EndedSessionsResponseDto,
} from "./dto/account-session.dto";

/** Коды 4xx списка устройств. */
export const ACCOUNT_SESSION_ERROR_CODES = {
    notFound: "session_not_found",
    current: "current_session",
} as const;

/**
 * Устройства аккаунта (TASK-735) для контроллеров обеих аудиторий. Список общий для аккаунта —
 * человек видит и CRM, и кабинет. Закрыть можно свою сессию на другом устройстве; текущая
 * закрывается выходом.
 */
@Injectable()
export class AccountSessionsHandler {
    constructor(private readonly sessions: SessionsService) {}

    async list(user: AuthenticatedUser): Promise<AccountSessionsResponseDto> {
        const sessions = await this.sessions.listForUser(user.userId);
        return {
            sessions: sessions.map(
                (session): AccountSessionDto => ({
                    id: session.id,
                    audience: session.audience,
                    signInMethod: session.signInMethod,
                    userAgent: session.userAgent,
                    ipAddress: session.ipAddress,
                    createdAt: session.createdAt.toISOString(),
                    lastUsedAt: session.lastUsedAt.toISOString(),
                    current: session.id === user.sessionId,
                })
            ),
        };
    }

    async end(user: AuthenticatedUser, sessionId: string): Promise<void> {
        if (sessionId === user.sessionId) {
            throw new ConflictException({
                message: "The current session ends with logout",
                code: ACCOUNT_SESSION_ERROR_CODES.current,
            });
        }
        if (!(await this.sessions.endOwned(user.userId, sessionId))) {
            throw new NotFoundException({
                message: "Session not found",
                code: ACCOUNT_SESSION_ERROR_CODES.notFound,
            });
        }
    }

    async endOthers(user: AuthenticatedUser): Promise<EndedSessionsResponseDto> {
        const ended = await this.sessions.endAllForUser(
            user.userId,
            "sign_out_everywhere",
            user.sessionId
        );
        return { ended };
    }
}
