import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { DiscoveryModule } from "@nestjs/core";

import { PrismaModule } from "@common/prisma/prisma.module";
import { OPERATIONS_JOB_OPTIONS } from "@common/queue/job-options";

import { BackgroundOperationInterceptor } from "./api/background-operation.interceptor";
import { CrmOperationsController } from "./api/controllers/crm-operations.controller";
import { OperationRunnerRegistry } from "./application/operation-runner.registry";
import { OperationsService } from "./application/operations.service";
import { OperationRepository } from "./domain/repositories/operation-repository.interface";
import { OperationPrismaRepository } from "./infrastructure/operation-prisma.repository";
import { OperationsProcessor } from "./infrastructure/operations.processor";
import { OPERATIONS_QUEUE_NAME } from "./operations.constants";

/**
 * Фоновые операции (TASK-809, documentation/backend/BACKGROUND_OPERATIONS.md): строки
 * `operations`, очередь, воркер и реестр исполнителей. Глобальный — `@BackgroundOperation`
 * ставится на маршруты любого модуля, исполнители объявляются там, где живут, через `@RunsOperation`.
 */
@Global()
@Module({
    imports: [
        DiscoveryModule,
        PrismaModule,
        BullModule.registerQueue({
            name: OPERATIONS_QUEUE_NAME,
            defaultJobOptions: OPERATIONS_JOB_OPTIONS,
        }),
    ],
    controllers: [CrmOperationsController],
    providers: [
        { provide: OperationRepository, useClass: OperationPrismaRepository },
        OperationsService,
        OperationRunnerRegistry,
        OperationsProcessor,
        BackgroundOperationInterceptor,
    ],
    exports: [OperationsService, BackgroundOperationInterceptor],
})
export class OperationsModule {}
