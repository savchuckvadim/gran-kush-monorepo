export { DomainEventConsumerRegistry } from "./application/domain-event-consumer.registry";
export { DomainEventPublisher } from "./application/domain-event-publisher.service";
export { OnDomainEvent } from "./application/on-domain-event.decorator";
export {
    employeeActor,
    type EventsOf,
    memberActor,
    type NewDomainEvent,
    SYSTEM_ACTOR,
    userActor,
} from "./domain/new-domain-event";
export type { OutboxTransaction } from "./domain/outbox-transaction";
export { EventsModule } from "./events.module";
