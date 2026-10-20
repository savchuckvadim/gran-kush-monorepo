import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { DomainEvent } from "@workspace/domain-events";
import { Queue } from "bullmq";

import { buildJobId } from "@common/queue/job-options";

import { DomainEventConsumerRegistry } from "../application/domain-event-consumer.registry";
import { DomainEventsConfig, domainEventsConfig } from "../application/domain-events.config";
import { OutboxRepository } from "../domain/repositories/outbox-repository.interface";
import { DOMAIN_EVENTS_JOB_NAMES, DOMAIN_EVENTS_QUEUE_NAME } from "../events.constants";

import type { DeliverJobData } from "./deliver-job";

/**
 * Релей outbox → очередь. Опрашивает `domain_events` с паузой `relayIntervalMs` и для каждого
 * события ставит по задаче на потребителя. Свой таймер вместо `@Interval`: следующий опрос
 * планируется после завершения предыдущего, поэтому два опроса одного процесса не
 * накладываются. Несколько инстансов API делят работу через `FOR UPDATE SKIP LOCKED`.
 */
@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(OutboxRelayService.name);
    private readonly config: DomainEventsConfig;
    private timer: NodeJS.Timeout | null = null;
    private inFlight: Promise<void> | null = null;
    private stopped = false;

    constructor(
        private readonly outbox: OutboxRepository,
        private readonly registry: DomainEventConsumerRegistry,
        @InjectQueue(DOMAIN_EVENTS_QUEUE_NAME) private readonly queue: Queue<DeliverJobData>,
        config: ConfigService
    ) {
        this.config = domainEventsConfig(config);
    }

    onModuleInit(): void {
        if (!this.config.relayEnabled) {
            this.logger.log("Релей событий выключен (DOMAIN_EVENTS_RELAY_ENABLED=false)");
            return;
        }
        this.schedule();
    }

    /** Остановка ждёт текущий опрос: иначе он доходит до уже закрытого соединения с БД. */
    async onModuleDestroy(): Promise<void> {
        this.stopped = true;
        if (this.timer) clearTimeout(this.timer);
        await this.inFlight;
    }

    /** Один опрос: вернуть число разданных событий. Публичный — для тестов и ручного прогона. */
    async relayOnce(): Promise<number> {
        return this.outbox.claimUndispatched(this.config.relayBatchSize, (events) =>
            this.enqueue(events)
        );
    }

    private async enqueue(events: readonly DomainEvent[]): Promise<void> {
        const jobs = events.flatMap((event) =>
            this.registry.consumersFor(event.name).map((consumer) => ({
                name: DOMAIN_EVENTS_JOB_NAMES.DELIVER,
                data: { event, consumer },
                opts: { jobId: buildJobId("evt", event.id, consumer) },
            }))
        );
        if (jobs.length === 0) return;
        await this.queue.addBulk(jobs);
    }

    private schedule(): void {
        this.timer = setTimeout(() => {
            this.inFlight = this.tick();
        }, this.config.relayIntervalMs);
        // таймер не держит процесс: тесты и остановка не ждут следующего опроса
        this.timer.unref();
    }

    private async tick(): Promise<void> {
        if (this.stopped) return;
        try {
            // полный пакет значит, что в outbox есть ещё: опрашиваем сразу, без паузы
            let relayed: number;
            do {
                relayed = await this.relayOnce();
            } while (relayed === this.config.relayBatchSize && !this.stopped);
        } catch (error) {
            this.logger.error(
                `Релей событий: ${error instanceof Error ? error.message : String(error)}`
            );
        } finally {
            if (!this.stopped) this.schedule();
        }
    }
}
