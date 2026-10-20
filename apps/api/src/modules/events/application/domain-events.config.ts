import type { ConfigService } from "@nestjs/config";

export interface DomainEventsConfig {
    /** Выключают у процессов без очереди (janitor) и в тестах, где релей не нужен */
    relayEnabled: boolean;
    /** Пауза между опросами outbox; меньше — быстрее realtime, больше — реже запрос к БД */
    relayIntervalMs: number;
    /** Сколько событий релей забирает за один опрос */
    relayBatchSize: number;
}

export const DOMAIN_EVENTS_DEFAULTS: DomainEventsConfig = {
    relayEnabled: true,
    relayIntervalMs: 300,
    relayBatchSize: 100,
};

const positiveInt = (raw: string | undefined, fallback: number): number => {
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : fallback;
};

export const domainEventsConfig = (config: ConfigService): DomainEventsConfig => ({
    relayEnabled: config.get<string>("DOMAIN_EVENTS_RELAY_ENABLED") !== "false",
    relayIntervalMs: positiveInt(
        config.get<string>("DOMAIN_EVENTS_RELAY_INTERVAL_MS"),
        DOMAIN_EVENTS_DEFAULTS.relayIntervalMs
    ),
    relayBatchSize: positiveInt(
        config.get<string>("DOMAIN_EVENTS_RELAY_BATCH_SIZE"),
        DOMAIN_EVENTS_DEFAULTS.relayBatchSize
    ),
});
