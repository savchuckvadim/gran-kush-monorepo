import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, Reflector } from "@nestjs/core";

import type { OperationRunner } from "../domain/operation";
import { OPERATION_RUNNER_METADATA } from "../operations.constants";

/**
 * Реестр исполнителей: на старте обходит провайдеры и собирает классы с `@RunsOperation`.
 * Воркер очереди спрашивает, кто выполняет операцию данного вида.
 */
@Injectable()
export class OperationRunnerRegistry implements OnModuleInit {
    private readonly logger = new Logger(OperationRunnerRegistry.name);
    private readonly runners = new Map<string, OperationRunner>();

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly reflector: Reflector
    ) {}

    onModuleInit(): void {
        for (const wrapper of this.discovery.getProviders()) {
            const instance: unknown = wrapper.instance;
            if (!instance || typeof instance !== "object") continue;
            const kind = this.reflector.get<string | undefined>(
                OPERATION_RUNNER_METADATA,
                instance.constructor
            );
            if (!kind) continue;
            this.register(kind, instance as OperationRunner);
        }
        this.logger.log(`Исполнители операций: ${this.runners.size}`);
    }

    register(kind: string, runner: OperationRunner): void {
        if (this.runners.has(kind)) {
            throw new Error(`Operation ${kind} has two runners`);
        }
        if (typeof runner.run !== "function") {
            throw new Error(`Runner of operation ${kind} has no run() method`);
        }
        this.runners.set(kind, runner);
    }

    runnerFor(kind: string): OperationRunner | undefined {
        return this.runners.get(kind);
    }
}
