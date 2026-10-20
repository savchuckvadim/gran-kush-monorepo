import { Injectable } from "@nestjs/common";

import { type DomainEvent, type EventName, findEventDefinition } from "@workspace/domain-events";
import { randomUUID } from "crypto";

import type { NewDomainEvent } from "../domain/new-domain-event";
import type { OutboxTransaction } from "../domain/outbox-transaction";
import { OutboxRepository } from "../domain/repositories/outbox-repository.interface";

/**
 * Единственный способ опубликовать доменное событие (TASK-780). Пишет конверт в outbox той же
 * транзакцией, что и изменение: откатилась транзакция — события нет; закоммитилась — релей
 * раздаст его потребителям. Payload проверяется по каталогу и очищается от лишних полей, чтобы
 * строка Prisma не утекла в контракт.
 */
@Injectable()
export class DomainEventPublisher {
    constructor(private readonly outbox: OutboxRepository) {}

    async publish<N extends EventName>(
        tx: OutboxTransaction,
        input: NewDomainEvent<N>
    ): Promise<DomainEvent<N>> {
        const [event] = await this.publishMany(tx, [input]);
        return event as DomainEvent<N>;
    }

    async publishMany(
        tx: OutboxTransaction,
        inputs: readonly NewDomainEvent[]
    ): Promise<DomainEvent[]> {
        if (inputs.length === 0) return [];
        const events = inputs.map((input) => this.toEnvelope(input));
        await this.outbox.append(tx, events);
        return events;
    }

    /** Конверт без записи — для тестов потребителей и для проверки payload до транзакции. */
    toEnvelope(input: NewDomainEvent): DomainEvent {
        const definition = findEventDefinition(input.name);
        if (!definition) {
            throw new Error(`Domain event ${input.name} is not in the catalog`);
        }
        if (definition.scope === "portal" && !input.portalId) {
            throw new Error(`Domain event ${input.name} requires portalId`);
        }
        if (definition.scope === "account" && input.portalId) {
            throw new Error(`Domain event ${input.name} is account-scoped and takes no portalId`);
        }
        const payload = definition.payload.parse(input.payload) as DomainEvent["payload"];
        return {
            id: randomUUID(),
            name: input.name,
            version: definition.version,
            portalId: input.portalId,
            occurredAt: (input.occurredAt ?? new Date()).toISOString(),
            actor: input.actor,
            aggregate: { kind: definition.aggregate, id: input.aggregateId },
            payload,
        } as DomainEvent;
    }
}
