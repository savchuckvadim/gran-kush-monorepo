import type { EventActor, EventName, EventPayload } from "@workspace/domain-events";

/**
 * Что публикует модуль-владелец агрегата. Вид агрегата и версия берутся из каталога, id и время
 * ставит публикатор. `portalId` обязателен для событий клуба и `null` для событий аккаунта.
 */
export type NewDomainEvent<N extends EventName = EventName> = N extends EventName
    ? {
          name: N;
          portalId: string | null;
          actor: EventActor;
          aggregateId: string;
          payload: EventPayload<N>;
          occurredAt?: Date;
      }
    : never;

export const SYSTEM_ACTOR: EventActor = { kind: "system", id: null };

export const employeeActor = (employeeId: string): EventActor => ({
    kind: "employee",
    id: employeeId,
});

export const memberActor = (memberId: string): EventActor => ({ kind: "member", id: memberId });

export const userActor = (userId: string): EventActor => ({ kind: "user", id: userId });

/**
 * Построитель событий из результата записи. Репозиторий вызывает его внутри своей транзакции,
 * когда id и номера уже выданы, и пишет события в outbox вместе с изменением.
 */
export type EventsOf<T> = (result: T) => readonly NewDomainEvent[];
