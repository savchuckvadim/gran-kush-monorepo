import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DiscoveryService, MetadataScanner, Reflector } from "@nestjs/core";

import type { DomainEvent, EventName } from "@workspace/domain-events";

import { DOMAIN_EVENT_HANDLER_METADATA } from "../events.constants";

export type DomainEventHandler = (event: DomainEvent) => Promise<void> | void;

/**
 * Реестр потребителей: на старте обходит провайдеры и собирает методы с `@OnDomainEvent`.
 * Релей спрашивает, кому раздать событие; воркер очереди — чем его обработать.
 */
@Injectable()
export class DomainEventConsumerRegistry implements OnModuleInit {
    private readonly logger = new Logger(DomainEventConsumerRegistry.name);
    private readonly handlers = new Map<string, Map<EventName, DomainEventHandler>>();
    private readonly consumersByEvent = new Map<EventName, string[]>();

    constructor(
        private readonly discovery: DiscoveryService,
        private readonly scanner: MetadataScanner,
        private readonly reflector: Reflector
    ) {}

    onModuleInit(): void {
        for (const wrapper of this.discovery.getProviders()) {
            const instance: unknown = wrapper.instance;
            if (!instance || typeof instance !== "object") continue;
            const prototype = Object.getPrototypeOf(instance) as object;
            for (const method of this.scanner.getAllMethodNames(prototype)) {
                const handler = (instance as Record<string, unknown>)[method];
                if (typeof handler !== "function") continue;
                const names = this.reflector.get<readonly EventName[] | undefined>(
                    DOMAIN_EVENT_HANDLER_METADATA,
                    handler
                );
                if (!names?.length) continue;
                this.register(
                    instance.constructor.name,
                    names,
                    (handler as DomainEventHandler).bind(instance)
                );
            }
        }
        this.logger.log(
            `Потребители событий: ${this.handlers.size}, подписок: ${[...this.consumersByEvent.values()].reduce((n, c) => n + c.length, 0)}`
        );
    }

    register(consumer: string, names: readonly EventName[], handler: DomainEventHandler): void {
        const byName = this.handlers.get(consumer) ?? new Map<EventName, DomainEventHandler>();
        for (const name of names) {
            if (byName.has(name)) {
                throw new Error(`Consumer ${consumer} subscribes to ${name} twice`);
            }
            byName.set(name, handler);
            const consumers = this.consumersByEvent.get(name) ?? [];
            consumers.push(consumer);
            this.consumersByEvent.set(name, consumers);
        }
        this.handlers.set(consumer, byName);
    }

    consumersFor(name: EventName): readonly string[] {
        return this.consumersByEvent.get(name) ?? [];
    }

    handlerFor(consumer: string, name: EventName): DomainEventHandler | undefined {
        return this.handlers.get(consumer)?.get(name);
    }
}
