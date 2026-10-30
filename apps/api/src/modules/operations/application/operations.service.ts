import { InjectQueue } from "@nestjs/bullmq";
import {
    HttpException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from "@nestjs/common";

import { Queue } from "bullmq";

import { IdempotencyService } from "@common/idempotency";
import { buildJobId } from "@common/queue/job-options";

import {
    type JsonObject,
    type Operation,
    OPERATION_ERROR_MAX_LENGTH,
    OPERATION_FAILURES,
} from "../domain/operation";
import { OperationRepository } from "../domain/repositories/operation-repository.interface";
import type { RunOperationJobData } from "../infrastructure/run-operation-job";
import { OPERATIONS_JOB_NAMES, OPERATIONS_QUEUE_NAME } from "../operations.constants";

import { operationFailedEvent, operationFinishedEvent } from "./operation-events";
import { OperationRunnerRegistry } from "./operation-runner.registry";

export interface EnqueueOperationRequest {
    kind: string;
    portalId: string;
    employeeId: string;
    input: JsonObject;
    idempotencyKey: string | null;
}

const messageOf = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

/**
 * Причина сбоя для строки и события: код доменной ошибки (4xx `HttpException` с `code`) — её
 * можно показать автору; всё остальное — `operation_failed`, подробности только в логе.
 */
const failureCodeOf = (error: unknown): string => {
    if (!(error instanceof HttpException) || error.getStatus() >= 500) {
        return OPERATION_FAILURES.internal;
    }
    const response: unknown = error.getResponse();
    const code =
        typeof response === "object" && response !== null
            ? (response as { code?: unknown }).code
            : undefined;
    return typeof code === "string" && code.length > 0 && code.length <= OPERATION_ERROR_MAX_LENGTH
        ? code
        : OPERATION_FAILURES.internal;
};

/**
 * Фоновые операции (TASK-809): маршрут с `@BackgroundOperation` отвечает 202 и id, воркер
 * очереди `operations` выполняет исполнитель вида, итог автор получает событием и `GET`.
 * - повтор запроса с тем же `Idempotency-Key` и входом — та же операция; с другим входом — 422;
 * - очередь не приняла задачу — строка сразу `failed`, клиенту 503: повторить позже;
 * - операцию видят только её клуб и её автор.
 */
@Injectable()
export class OperationsService {
    private readonly logger = new Logger(OperationsService.name);

    constructor(
        private readonly operations: OperationRepository,
        private readonly runners: OperationRunnerRegistry,
        private readonly idempotency: IdempotencyService,
        @InjectQueue(OPERATIONS_QUEUE_NAME) private readonly queue: Queue<RunOperationJobData>
    ) {}

    async enqueue(request: EnqueueOperationRequest): Promise<Operation> {
        const outcome = await this.operations.create({
            portalId: request.portalId,
            kind: request.kind,
            requestedByEmployeeId: request.employeeId,
            input: request.input,
            inputHash: this.idempotency.hashRequest(request.input),
            idempotencyKey: request.idempotencyKey,
        });
        if (outcome.kind === "mismatch") {
            throw new UnprocessableEntityException(
                "Idempotency-Key уже использован с другим входом операции"
            );
        }
        if (outcome.kind === "existing") return outcome.operation;

        const operation = outcome.operation;
        try {
            await this.queue.add(
                OPERATIONS_JOB_NAMES.RUN,
                { operationId: operation.id },
                { jobId: buildJobId("op", operation.id) }
            );
        } catch (error) {
            // строка без задачи висела бы queued вечно: честнее закрыть её сразу
            this.logger.error(
                `Операция ${operation.kind} ${operation.id} не поставлена в очередь: ${messageOf(error)}`
            );
            await this.failWith(operation, OPERATION_FAILURES.queueUnavailable);
            throw new ServiceUnavailableException(
                "Background operations are unavailable, retry later"
            );
        }
        return operation;
    }

    async getForRequester(id: string, portalId: string, employeeId: string): Promise<Operation> {
        const operation = await this.operations.findForRequester(id, portalId, employeeId);
        if (!operation) {
            throw new NotFoundException("Operation not found");
        }
        return operation;
    }

    /** Тело воркера: взять `queued`, выполнить исполнитель вида, записать итог или причину и событие. */
    async execute(operationId: string): Promise<void> {
        const operation = await this.operations.start(operationId);
        if (!operation) {
            this.logger.warn(`Операция ${operationId} уже взята или завершена — пропускаю`);
            return;
        }
        const runner = this.runners.runnerFor(operation.kind);
        if (!runner) {
            this.logger.error(`Для операции ${operation.kind} нет исполнителя (@RunsOperation)`);
            await this.failWith(operation, OPERATION_FAILURES.noRunner);
            return;
        }
        try {
            const result = await runner.run(operation.input, {
                operationId: operation.id,
                portalId: operation.portalId,
                employeeId: operation.requestedByEmployeeId,
            });
            await this.operations.finish(operation.id, result ?? null, [
                operationFinishedEvent(operation),
            ]);
        } catch (error) {
            this.logger.error(
                `Операция ${operation.kind} ${operation.id} упала: ${messageOf(error)}`,
                error instanceof Error ? error.stack : undefined
            );
            await this.failWith(operation, failureCodeOf(error));
        }
    }

    private failWith(operation: Operation, errorCode: string): Promise<void> {
        return this.operations.fail(operation.id, errorCode, [
            operationFailedEvent(operation, errorCode),
        ]);
    }
}
