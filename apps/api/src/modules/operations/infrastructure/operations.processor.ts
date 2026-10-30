import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";

import { Job } from "bullmq";

import { APP_EVENTS } from "@common/events/events.constants";

import { OperationsService } from "../application/operations.service";
import {
    OPERATIONS_CONCURRENCY,
    OPERATIONS_JOB_NAMES,
    OPERATIONS_QUEUE_NAME,
} from "../operations.constants";

import type { RunOperationJobData } from "./run-operation-job";

/**
 * Воркер операций. Сбой исполнителя сервис записывает в строку сам, поэтому сюда долетают только
 * сбои механизма (БД недоступна); задача одна попытка — строка остаётся `running`, и это видно.
 */
@Processor(OPERATIONS_QUEUE_NAME, { concurrency: OPERATIONS_CONCURRENCY })
@Injectable()
export class OperationsProcessor extends WorkerHost {
    private readonly logger = new Logger(OperationsProcessor.name);

    constructor(private readonly operations: OperationsService) {
        super();
    }

    async process(job: Job<RunOperationJobData>): Promise<void> {
        if (job.name !== OPERATIONS_JOB_NAMES.RUN) {
            this.logger.warn(`Неизвестная задача операций: ${job.name}`);
            return;
        }
        await this.operations.execute(job.data.operationId);
    }

    @OnWorkerEvent(APP_EVENTS.QUEUE.FAILED)
    onFailed(job: Job<RunOperationJobData> | undefined, error: Error): void {
        this.logger.error(
            `Задача операции ${job?.data.operationId ?? "?"} не выполнена: ${error.message}`
        );
    }
}
