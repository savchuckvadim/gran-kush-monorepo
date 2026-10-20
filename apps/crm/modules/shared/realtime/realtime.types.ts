import type { QueryKey } from "@tanstack/react-query";

import type { DomainEvent, EventName } from "@workspace/domain-events";

/** Приложение соединения: неймспейс шлюза и куки сессии. */
export type RealtimeAudience = "crm" | "cabinet";

/**
 * `online` — события приходят; `offline` — связи нет, данные перечитываются по таймеру;
 * `denied` — в этот клуб нельзя (нет членства, чужой адрес), повторять бесполезно.
 */
export type RealtimeStatus = "connecting" | "online" | "offline" | "denied";

/** Что известно правилу о соединении: клуб, к которому оно открыто. */
export interface RealtimeScope {
    portal: string | null;
}

/**
 * Что перечитать, когда пришло событие. Правило живёт в сущности, которой принадлежат ключи
 * (`entities/<x>/realtime.ts`); участнику событие приходит только с публичными полями.
 */
export interface RealtimeRule {
    events: readonly EventName[];
    keys: (event: DomainEvent, scope: RealtimeScope) => readonly QueryKey[];
}
