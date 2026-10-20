import { Injectable } from "@nestjs/common";

import { Prisma } from "@prisma/client";
import type { DomainEvent } from "@workspace/domain-events";

import { PrismaService } from "@common/prisma/prisma.service";

import type { OutboxTransaction } from "../domain/outbox-transaction";
import {
    EventDeliveryState,
    OutboxRepository,
} from "../domain/repositories/outbox-repository.interface";

/** Строка `domain_events` в том виде, в каком её отдаёт `FOR UPDATE SKIP LOCKED` */
interface OutboxRow {
    id: string;
    portal_id: string | null;
    name: string;
    version: number;
    aggregate_kind: string;
    aggregate_id: string;
    actor_kind: string;
    actor_id: string | null;
    payload: unknown;
    occurred_at: Date;
}

/** Релей ставит до сотни задач в очередь внутри транзакции — умолчания Prisma (5 с) впритык */
const CLAIM_TRANSACTION_TIMEOUT_MS = 20_000;

/** Нарушение внешнего ключа: строки события уже нет */
const isMissingEvent = (error: unknown): boolean =>
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";

const toEnvelope = (row: OutboxRow): DomainEvent =>
    ({
        id: row.id,
        name: row.name,
        version: row.version,
        portalId: row.portal_id,
        occurredAt: row.occurred_at.toISOString(),
        actor: { kind: row.actor_kind, id: row.actor_id },
        aggregate: { kind: row.aggregate_kind, id: row.aggregate_id },
        payload: row.payload,
    }) as DomainEvent;

@Injectable()
export class OutboxPrismaRepository extends OutboxRepository {
    constructor(private readonly prisma: PrismaService) {
        super();
    }

    async append(tx: OutboxTransaction, events: readonly DomainEvent[]): Promise<void> {
        await tx.domainEvent.createMany({
            data: events.map((event) => ({
                id: event.id,
                portalId: event.portalId,
                name: event.name,
                version: event.version,
                aggregateKind: event.aggregate.kind,
                aggregateId: event.aggregate.id,
                actorKind: event.actor.kind,
                actorId: event.actor.id,
                payload: event.payload as Prisma.InputJsonValue,
                occurredAt: new Date(event.occurredAt),
            })),
        });
    }

    async claimUndispatched(
        limit: number,
        dispatch: (events: readonly DomainEvent[]) => Promise<void>
    ): Promise<number> {
        return this.prisma.$transaction(
            async (tx) => {
                const rows = await tx.$queryRaw<OutboxRow[]>`
                    SELECT id, portal_id, name, version, aggregate_kind, aggregate_id,
                           actor_kind, actor_id, payload, occurred_at
                    FROM domain_events
                    WHERE dispatched_at IS NULL
                    ORDER BY sequence
                    LIMIT ${limit}
                    FOR UPDATE SKIP LOCKED`;
                if (rows.length === 0) return 0;

                await dispatch(rows.map(toEnvelope));
                await tx.domainEvent.updateMany({
                    where: { id: { in: rows.map((row) => row.id) } },
                    data: { dispatchedAt: new Date() },
                });
                return rows.length;
            },
            { timeout: CLAIM_TRANSACTION_TIMEOUT_MS }
        );
    }

    async deliveryState(eventId: string, consumer: string): Promise<EventDeliveryState> {
        const event = await this.prisma.domainEvent.findUnique({
            where: { id: eventId },
            select: { deliveries: { where: { consumer }, select: { deliveredAt: true } } },
        });
        if (!event) return "missing";
        return event.deliveries[0]?.deliveredAt ? "delivered" : "pending";
    }

    async markDelivered(eventId: string, consumer: string): Promise<void> {
        await this.upsertDelivery(eventId, consumer, { deliveredAt: new Date(), lastError: null });
    }

    async markFailed(eventId: string, consumer: string, error: string): Promise<void> {
        await this.upsertDelivery(eventId, consumer, { lastError: error });
    }

    private async upsertDelivery(
        eventId: string,
        consumer: string,
        data: { deliveredAt?: Date; lastError: string | null }
    ): Promise<void> {
        try {
            await this.prisma.domainEventDelivery.upsert({
                where: { eventId_consumer: { eventId, consumer } },
                create: { eventId, consumer, attempts: 1, ...data },
                update: { attempts: { increment: 1 }, ...data },
            });
        } catch (error) {
            if (!isMissingEvent(error)) throw error;
        }
    }
}
