import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { isEventName } from "@workspace/domain-events";
import { Job } from "bullmq";

import { APP_EVENTS } from "@common/events/events.constants";
import { TelegramService } from "@common/telegram/telegram.service";

import { DomainEventConsumerRegistry } from "../application/domain-event-consumer.registry";
import { OutboxRepository } from "../domain/repositories/outbox-repository.interface";
import {
    DOMAIN_EVENTS_DELIVERY_CONCURRENCY,
    DOMAIN_EVENTS_JOB_NAMES,
    DOMAIN_EVENTS_QUEUE_NAME,
} from "../events.constants";

import type { DeliverJobData } from "./deliver-job";

/**
 * Воркер доставки: вызывает метод потребителя и фиксирует доставку. Повтор задачи после
 * сбоя между вызовом и фиксацией вызовет потребителя второй раз — потому потребители
 * идемпотентны. Исчерпанные попытки — алерт в Telegram, задача остаётся в failed.
 */
@Processor(DOMAIN_EVENTS_QUEUE_NAME, { concurrency: DOMAIN_EVENTS_DELIVERY_CONCURRENCY })
@Injectable()
export class DomainEventsProcessor extends WorkerHost {
    private readonly logger = new Logger(DomainEventsProcessor.name);

    constructor(
        private readonly registry: DomainEventConsumerRegistry,
        private readonly outbox: OutboxRepository,
        private readonly telegram: TelegramService
    ) {
        super();
    }

    async process(job: Job<DeliverJobData>): Promise<void> {
        if (job.name !== DOMAIN_EVENTS_JOB_NAMES.DELIVER) {
            this.logger.warn(`Неизвестная задача событий: ${job.name}`);
            return;
        }
        const { event, consumer } = job.data;
        // имя пришло из очереди: задача могла пережить удаление события из каталога
        const name: string = event.name;
        if (!isEventName(name)) {
            this.logger.warn(`Событие ${name} не в каталоге — пропускаю (${event.id})`);
            return;
        }
        const handler = this.registry.handlerFor(consumer, event.name);
        if (!handler) {
            // потребитель удалён или переименован между релеем и доставкой
            this.logger.warn(`Потребитель ${consumer} не подписан на ${event.name} — пропускаю`);
            return;
        }
        // клуб удалён вместе с событием, или потребитель уже отработал — делать нечего
        if ((await this.outbox.deliveryState(event.id, consumer)) !== "pending") return;

        try {
            await handler(event);
        } catch (error) {
            await this.outbox.markFailed(
                event.id,
                consumer,
                error instanceof Error ? error.message : String(error)
            );
            throw error;
        }
        await this.outbox.markDelivered(event.id, consumer);
    }

    @OnWorkerEvent(APP_EVENTS.QUEUE.FAILED)
    onFailed(job: Job<DeliverJobData> | undefined, error: Error): void {
        if (!job) return;
        const { event, consumer } = job.data;
        const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
        this.logger.error(
            `Доставка ${event.name} → ${consumer} не удалась (попытка ${job.attemptsMade}` +
                `${exhausted ? ", последняя" : ""}): ${error.message}`
        );
        if (exhausted) {
            // алерт не должен ронять воркер: недоступный Telegram — только строка в логе
            this.telegram
                .sendMessage(
                    `⚠️ Событие ${event.name} не доставлено потребителю ${consumer} после ` +
                        `${job.attemptsMade} попыток\nid: ${event.id}\nportal: ${event.portalId ?? "—"}\n` +
                        `${error.message}`
                )
                .catch((alertError: unknown) =>
                    this.logger.error(
                        `Алерт о недоставленном событии не отправлен: ${alertError instanceof Error ? alertError.message : String(alertError)}`
                    )
                );
        }
    }
}
