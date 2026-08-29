/** Заголовок клиентского ключа идемпотентности. */
export const IDEMPOTENCY_HEADER = "idempotency-key";

/** Ключ метаданных, который ставит `@Idempotent(scope)`. */
export const IDEMPOTENCY_SCOPE_METADATA = "idempotency:scope";

/** Максимальная длина клиентского ключа — совпадает с шириной колонки. */
export const IDEMPOTENCY_KEY_MAX_LENGTH = 255;

/** Сколько живёт занятый ключ. Дольше любого разумного ретрая клиента или провайдера. */
export const IDEMPOTENCY_TTL_HOURS = 24;

/**
 * Логические маршруты. Значение уезжает в БД, поэтому переименование scope
 * обесценивает уже сохранённые ключи — менять только осознанно.
 */
export const IdempotencyScope = {
    LK_ORDER_CREATE: "lk.orders.create",
    CRM_FINANCE_TRANSACTION_CREATE: "crm.finance.transactions.create",
} as const;

export type IdempotencyScope = (typeof IdempotencyScope)[keyof typeof IdempotencyScope];
