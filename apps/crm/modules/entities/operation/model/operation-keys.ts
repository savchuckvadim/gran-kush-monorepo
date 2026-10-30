export const operationKeys = {
    all: ["operations"] as const,
    one: (id: string) => ["operations", id] as const,
};

/**
 * Запасной опрос незавершённой операции: итог приносит сокет (`operation.finished` / `failed`),
 * опрос нужен только на случай потерянного соединения.
 */
export const OPERATION_POLL_MS = 5_000;
