import type { SessionRevokeReason } from "@prisma/client";

import { type NewDomainEvent, SYSTEM_ACTOR, userActor } from "@modules/events";

import { type AnySessionAudience, isAppAudience } from "../domain/auth-session";

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
    audience: AnySessionAudience;
}

/**
 * Каждый отзыв сессии приложения клуба — событие аккаунта `session.revoked`: realtime-шлюз сразу рвёт
 * сокеты этой сессии, а не ждёт истечения access-токена. У админки платформы сокетов нет — событий тоже.
 */
export const sessionRevokedEvents = (
    sessions: readonly RevokedSession[],
    reason: SessionRevokeReason
): NewDomainEvent[] =>
    sessions.flatMap(({ id, userId, audience }) =>
        isAppAudience(audience)
            ? [
                  {
                      name: "session.revoked" as const,
                      portalId: null,
                      actor: BY_ACCOUNT.has(reason) ? userActor(userId) : SYSTEM_ACTOR,
                      aggregateId: id,
                      payload: { sessionId: id, userId, audience, reason },
                  },
              ]
            : []
    );
