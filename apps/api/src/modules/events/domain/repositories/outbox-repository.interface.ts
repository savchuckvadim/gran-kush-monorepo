import type { DomainEvent } from "@workspace/domain-events";

import type { OutboxTransaction } from "../outbox-transaction";

/**
 * Где доставка события потребителю: `missing` — события уже нет (клуб удалён, строки ушли
 * каскадом), доставлять некому; `delivered` — потребитель уже отработал; `pending` — ждёт.
 */
export type EventDeliveryState = "missing" | "pending" | "delivered";

/** Outbox событий: запись в транзакции владельца, выдача релею, учёт доставок потребителям. */
export abstract class OutboxRepository {
    abstract append(tx: OutboxTransaction, events: readonly DomainEvent[]): Promise<void>;

    /**
     * Забрать не разданные события по порядку публикации, отдать их `dispatch` и пометить
     * разданными — в одной транзакции: если `dispatch` упал, события останутся в очереди на
     * следующий опрос. Несколько релеев безопасны (`FOR UPDATE SKIP LOCKED`).
     * Возвращает число разданных событий.
     */
    abstract claimUndispatched(
        limit: number,
        dispatch: (events: readonly DomainEvent[]) => Promise<void>
    ): Promise<number>;

    abstract deliveryState(eventId: string, consumer: string): Promise<EventDeliveryState>;

    /** Отметки доставки; событие, удалённое тем временем вместе с клубом, — не ошибка. */
    abstract markDelivered(eventId: string, consumer: string): Promise<void>;

    abstract markFailed(eventId: string, consumer: string, error: string): Promise<void>;
}
