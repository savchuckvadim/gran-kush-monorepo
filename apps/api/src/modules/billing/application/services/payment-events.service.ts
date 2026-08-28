import { Inject, Injectable, Logger, Optional, UnauthorizedException } from "@nestjs/common";

import { Prisma } from "@prisma/client";

import { PrismaService } from "@common/prisma/prisma.service";

import {
    PAYMENT_WEBHOOK_VERIFIERS,
    PaymentEventInput,
    PaymentEventResult,
    PaymentWebhookRequest,
    PaymentWebhookVerifier,
} from "../../domain/payment-webhook.types";

/** Обработчик одного события. Выполняется внутри транзакции вместе с отметкой `processedAt`. */
export type PaymentEventHandler = (
    tx: Prisma.TransactionClient,
    event: PaymentEventInput
) => Promise<void>;

@Injectable()
export class PaymentEventsService {
    private readonly logger = new Logger(PaymentEventsService.name);
    private readonly verifiers: Map<string, PaymentWebhookVerifier>;

    constructor(
        private readonly prisma: PrismaService,
        @Optional()
        @Inject(PAYMENT_WEBHOOK_VERIFIERS)
        verifiers?: PaymentWebhookVerifier[]
    ) {
        this.verifiers = new Map((verifiers ?? []).map((v) => [v.provider, v]));
    }

    /**
     * Единственная точка входа вебхука. Порядок шагов — не деталь реализации, а само требование:
     *
     * 1. подпись проверяется до любого обращения к БД;
     * 2. событие пишется в журнал первым шагом — сырой payload переживает падение обработки;
     * 3. конфликт по `(provider, eventId)` означает повторную доставку;
     * 4. обработчик и отметка `processedAt` выполняются в одной транзакции.
     */
    async ingest(
        request: PaymentWebhookRequest,
        handle: PaymentEventHandler
    ): Promise<PaymentEventResult> {
        const event = this.parseVerified(request);
        const provider = request.provider;

        const inserted = await this.prisma.paymentEvent.createMany({
            data: [
                {
                    provider,
                    eventId: event.eventId,
                    type: event.type,
                    payload: event.payload,
                },
            ],
            skipDuplicates: true,
        });

        if (inserted.count === 0) {
            const existing = await this.prisma.paymentEvent.findUnique({
                where: { provider_eventId: { provider, eventId: event.eventId } },
                select: { processedAt: true },
            });
            // Уже обработано — тихий успех без повторного применения эффектов.
            if (existing?.processedAt) {
                this.logger.log(`Duplicate ${provider} event ${event.eventId} ignored`);
                return { outcome: "duplicate", provider, eventId: event.eventId };
            }
            // Запись есть, но обработка не доехала: процесс упал между вставкой и коммитом
            // транзакции обработки, либо предыдущая попытка завершилась ошибкой.
            // Это ретрай провайдера, а не дубль — обрабатываем.
        }

        await this.process(provider, event, handle);
        return { outcome: "processed", provider, eventId: event.eventId };
    }

    /** Подпись и разбор тела. Ни одного запроса к БД до успешного возврата. */
    private parseVerified(request: PaymentWebhookRequest): PaymentEventInput {
        const verifier = this.verifiers.get(request.provider);
        // Fail-closed. Отсутствие адаптера — это «проверить нечем», а не «проверять не нужно»:
        // гвард, пропускающий запрос при незаданной настройке, уже стоил нам открытых
        // эндпоинтов каталога (TASK-023).
        if (!verifier) {
            throw new UnauthorizedException("Unknown payment provider");
        }
        return verifier.parseVerified(request);
    }

    private async process(
        provider: string,
        event: PaymentEventInput,
        handle: PaymentEventHandler
    ): Promise<void> {
        try {
            await this.prisma.$transaction(async (tx) => {
                await handle(tx, event);
                await tx.paymentEvent.update({
                    where: { provider_eventId: { provider, eventId: event.eventId } },
                    data: { processedAt: new Date(), failedAt: null, error: null },
                });
            });
        } catch (error) {
            await this.markFailed(provider, event.eventId, error);
            // Наверх — чтобы контроллер ответил не-2xx и провайдер прислал событие снова.
            throw error;
        }
    }

    private async markFailed(provider: string, eventId: string, error: unknown): Promise<void> {
        const message = error instanceof Error ? error.message : String(error);
        try {
            await this.prisma.paymentEvent.update({
                where: { provider_eventId: { provider, eventId } },
                data: {
                    failedAt: new Date(),
                    error: message.slice(0, 2000),
                    attempts: { increment: 1 },
                },
            });
        } catch (markError) {
            // Отметка о провале — диагностика, а не часть контракта: она не должна подменять
            // собой исходную ошибку, которую мы пробрасываем наверх.
            this.logger.error(
                `Failed to mark ${provider} event ${eventId} as failed: ${String(markError)}`
            );
        }
    }
}
