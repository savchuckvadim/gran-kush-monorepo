import type { SessionRevokeReason } from "@prisma/client";

import { type NewDomainEvent, SYSTEM_ACTOR, userActor } from "@modules/events";

import type { SessionAudience } from "../domain/auth-session";

/** Отзывы, которые сделал сам человек; остальные — система (блокировка, кража refresh). */
const BY_ACCOUNT: ReadonlySet<SessionRevokeReason> = new Set<SessionRevokeReason>([
    "logout",
    "sign_out_everywhere",
    "revoked_by_user",
    "password_changed",
]);

export interface RevokedSession {
    id: string;
    userId: string;
    audience: SessionAudience;
}

/**
 * Каждый отзыв сессии — событие аккаунта `session.revoked`: realtime-шлюз сразу рвёт сокеты этой
 * сессии, а не ждёт истечения access-токена.
 */
export const sessionRevokedEvents = (
    sessions: readonly RevokedSession[],
    reason: SessionRevokeReason
): NewDomainEvent[] =>
    sessions.map((session) => ({
        name: "session.revoked",
        portalId: null,
        actor: BY_ACCOUNT.has(reason) ? userActor(session.userId) : SYSTEM_ACTOR,
        aggregateId: session.id,
        payload: {
            sessionId: session.id,
            userId: session.userId,
            audience: session.audience,
            reason,
        },
    }));
