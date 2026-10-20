import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import { PrismaModule } from "@common/prisma/prisma.module";
import { DOMAIN_EVENTS_JOB_OPTIONS } from "@common/queue/job-options";
import { TelegramModule } from "@common/telegram/telegram.module";

import { DomainEventConsumerRegistry } from "./application/domain-event-consumer.registry";
import { DomainEventPublisher } from "./application/domain-event-publisher.service";
import { OutboxRepository } from "./domain/repositories/outbox-repository.interface";
import { DOMAIN_EVENTS_QUEUE_NAME } from "./events.constants";
import { DomainEventsProcessor } from "./infrastructure/domain-events.processor";
import { OutboxPrismaRepository } from "./infrastructure/outbox-prisma.repository";
import { OutboxRelayService } from "./infrastructure/outbox-relay.service";

/**
 * Шина доменных событий (TASK-780, documentation/backend/DOMAIN_EVENTS.md): outbox, релей,
 * очередь доставки и реестр потребителей. Глобальный — публикатор нужен репозиториям и
 * use-case'ам любого модуля; потребители объявляются там, где живут, через `@OnDomainEvent`.
 */
@Global()
@Module({
    imports: [
        DiscoveryModule,
        PrismaModule,
        TelegramModule,
        BullModule.registerQueue({
            name: DOMAIN_EVENTS_QUEUE_NAME,
            defaultJobOptions: DOMAIN_EVENTS_JOB_OPTIONS,
        }),
    ],
    providers: [
        { provide: OutboxRepository, useClass: OutboxPrismaRepository },
        DomainEventPublisher,
        DomainEventConsumerRegistry,
        OutboxRelayService,
        DomainEventsProcessor,
    ],
    exports: [DomainEventPublisher, DomainEventConsumerRegistry, OutboxRepository],
})
export class EventsModule {}
