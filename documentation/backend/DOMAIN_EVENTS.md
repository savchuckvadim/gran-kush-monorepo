# Domain events

**Implemented** (TASK-780, 2026-10-20). Plan and the realtime part: [tasks/events-realtime](../tasks/events-realtime.md).

One bus for everything that someone else must learn about: realtime updates in the CRM and the
cabinet, notifications, the portal journal, integrations. A service never sends a letter, writes a
journal row or pushes a socket by itself: it publishes an event, consumers do the rest.

## Contract — `packages/domain-events`

Shared by the API, the CRM, the cabinet and the mobile app.

```ts
interface DomainEventEnvelope {
    id: string; // uuid, idempotency key of consumers
    name: string; // '<aggregate>.<past_tense>': 'order.stage_changed'
    version: number; // payload shape; a new shape is a new version
    portalId: string | null; // the club; null only for account events (sessions)
    occurredAt: string; // ISO
    actor: { kind: "employee" | "member" | "user" | "system"; id: string | null };
    aggregate: { kind: "order" | "member" | …; id: string };
    payload: unknown; // zod schema from the catalog
}
```

Every event is defined once with `defineEvent` in `src/catalog/<module>.events.ts`:

| Field           | Meaning                                                                         |
| --------------- | ------------------------------------------------------------------------------- |
| `scope`         | `portal` — belongs to one club, `portalId` required; `account` — no club        |
| `payload`       | zod schema; parsing strips unknown keys, so a Prisma row cannot leak            |
| `audience`      | who may receive it over realtime: staff with a permission, the member, the user |
| `publicPayload` | fields a member or an account sees; staff see the whole payload                 |

Rules for payloads: identifiers, statuses and names of things only. **No money** (prices, totals),
**no personal data** (emails, documents, profile fields): the receiver reads them with its own rights.

Catalog v1: `portal.founded`, `member.joined / consent_given / left / status_changed / updated`,
`order.placed / stage_changed / cancelled / payment_changed`, `product.changed / stock_changed`,
`presence.entered / left`, `employee.joined / access_changed`, `role.changed`, `session.revoked`,
`portal.module_changed`, `finance.profile_updated`, `finance.tax_rates_changed`, `notification.created`, `comment.added / updated / deleted`.

## Multi-tenancy

- `portalId` is part of the envelope, not of the payload; the publisher refuses a `portal` event
  without it and an `account` event with it.
- An event is published by the code that already resolved the club of the request
  (`@PortalId()`, the aggregate row of that portal): a request to another club fails before any write,
  so it produces no event (e2e `domain-events.e2e-spec.ts`).
- `domain_events.portal_id` cascades with the portal; deliveries of a deleted club are skipped.
- Consumers act inside `event.portalId` only. The realtime gateway (TASK-794) joins sockets to
  `portal:{id}:…` rooms, so an event never reaches another club.

## Publishing

`DomainEventPublisher.publish(tx, event)` / `publishMany(tx, events)` takes the transaction of the
change. The event row is written with the change or not at all.

Repositories own the transactions, so their write methods accept the events:

```ts
// application layer decides what happened…
await this.orderRepository.create(input, (order) => orderPlacedEvents(portalId, order));
await this.stageRepository.compareAndSetStage({ …, events: orderStageChangedEvents(…) });

// …infrastructure writes it atomically
return this.prisma.$transaction(async (tx) => {
    const order = toOrderEntity(await tx.order.create(…));
    if (events) await this.events.publishMany(tx, events(order));
    return order;
});
```

- `EventsOf<T>` — a builder from the written result, when ids or numbers are issued in the transaction.
- `readonly NewDomainEvent[]` — a ready list, written only if the compare-and-set wins.
- Event factories live next to the aggregate: `<module>/application/events/<aggregate>-events.ts`.

## Relay and delivery

```
domain_events ──OutboxRelayService (poll, FOR UPDATE SKIP LOCKED)──► queue `domain-events`
                                                                       │ one job per (event × consumer)
                                                          DomainEventsProcessor ──► @OnDomainEvent method
```

- The relay polls every `DOMAIN_EVENTS_RELAY_INTERVAL_MS` (300), takes `DOMAIN_EVENTS_RELAY_BATCH_SIZE`
  (100) rows in `sequence` order, enqueues them and marks `dispatched_at` in the same transaction.
  Several API instances share the work safely. `DOMAIN_EVENTS_RELAY_ENABLED=false` turns it off.
- Job id `evt__<eventId>__<consumer>`: a second enqueue of the same pair is ignored by BullMQ.
- `domain_event_deliveries (event_id, consumer)` records each delivery; a retried job whose consumer
  already ran does nothing. Consumers must still be idempotent: a crash between the call and the mark
  runs them again.
- 5 attempts with exponential backoff; the last failure stays in `failed` for a week and alerts
  Telegram. Ordering is guaranteed only inside one aggregate; consumers tolerate reordering.

## Adding an event

1. `defineEvent` in `packages/domain-events/src/catalog/<module>.events.ts`, a line in
   `catalog/index.ts`; `pnpm --filter @workspace/domain-events build` (runs on install too).
2. A factory in `<module>/application/events/`, called where the change happens; the repository
   method takes `events` and publishes in its transaction.
3. A unit test on the factory or the service, an e2e when the event crosses clubs or roles.

## Adding a consumer

```ts
@Injectable()
export class WelcomeLetterConsumer {
    @OnDomainEvent("portal.founded")
    async onPortalFounded(event: DomainEvent<"portal.founded">): Promise<void> { … }
}
```

Register the class as a provider of its module. One class — one delivery per event: split work that
fails independently (the welcome letter and the Telegram alert are two consumers).

## Consumers today

| Consumer                | Events           | Module                                 |
| ----------------------- | ---------------- | -------------------------------------- |
| `WelcomeLetterConsumer` | `portal.founded` | `portals`                              |
| `PlatformAlertConsumer` | `portal.founded` | `portals`                              |
| `RealtimeConsumer`      | every event      | `realtime` ([REALTIME](./REALTIME.md)) |
| `OrderNotificationsConsumer` | `order.placed`, `order.cancelled`, `order.stage_changed` | `notifications` |
| `TelegramNotificationsConsumer` | `notification.created` | `notifications` |

Notifications (TASK-781): rules turn events into personal notifications (`notifications` table,
one per event and recipient); each notification is the `notification.created` event for the bell and
the toast, and Telegram sends it as a separate consumer, so a Telegram failure retries only the send.
