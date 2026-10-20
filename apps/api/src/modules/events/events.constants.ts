export const DOMAIN_EVENTS_QUEUE_NAME = "domain-events" as const;

export const DOMAIN_EVENTS_JOB_NAMES = {
    /** Одна задача — одна пара «событие × потребитель» */
    DELIVER: "deliver",
} as const;

/** Параллельных доставок на инстанс API: потребители ходят в БД, почту и Telegram */
export const DOMAIN_EVENTS_DELIVERY_CONCURRENCY = 5;

/** Ключ метаданных `@OnDomainEvent` на методе потребителя */
export const DOMAIN_EVENT_HANDLER_METADATA = "domain-events:handler" as const;
