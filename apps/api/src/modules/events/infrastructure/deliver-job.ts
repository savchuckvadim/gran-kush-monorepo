import type { DomainEvent } from "@workspace/domain-events";

/** Данные задачи `deliver`: конверт события и имя потребителя (класс с `@OnDomainEvent`) */
export interface DeliverJobData {
    event: DomainEvent;
    consumer: string;
}
