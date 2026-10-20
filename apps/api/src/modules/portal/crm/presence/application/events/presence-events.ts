import { employeeActor, memberActor, type NewDomainEvent, SYSTEM_ACTOR } from "@modules/events";

import { ExitMethod, type PresenceSession } from "../../domain/entity/presence-session.entity";
import type { ClosedPresenceSession } from "../../domain/repositories/presence-settings-repository.interface";

/*
 * Вход и выход участника (packages/domain-events/src/catalog/presence.events.ts): по ним стойка
 * и кабинет («вы в клубе», магазин) обновляются сразу.
 */

export const presenceEnteredEvent = (
    portalId: string,
    session: PresenceSession,
    employeeId?: string
): NewDomainEvent => ({
    name: "presence.entered",
    portalId,
    actor: employeeId ? employeeActor(employeeId) : memberActor(session.memberId),
    aggregateId: session.id,
    payload: {
        sessionId: session.id,
        memberId: session.memberId,
        entryMethod: session.entryMethod,
        employeeId: employeeId ?? null,
    },
});

export const presenceLeftEvent = (
    portalId: string,
    session: PresenceSession,
    employeeId?: string
): NewDomainEvent => ({
    name: "presence.left",
    portalId,
    actor: employeeId ? employeeActor(employeeId) : memberActor(session.memberId),
    aggregateId: session.id,
    payload: {
        sessionId: session.id,
        memberId: session.memberId,
        exitMethod: session.exitMethod ?? "",
        employeeId: employeeId ?? null,
    },
});

/** Авто-выход по правилам клуба: событие на каждый закрытый визит, автор — система. */
export const autoExitEvents = (closed: readonly ClosedPresenceSession[]): NewDomainEvent[] =>
    closed.map((session) => ({
        name: "presence.left",
        portalId: session.portalId,
        actor: SYSTEM_ACTOR,
        aggregateId: session.sessionId,
        payload: {
            sessionId: session.sessionId,
            memberId: session.memberId,
            exitMethod: ExitMethod.AUTO_CRON,
            employeeId: null,
        },
    }));
