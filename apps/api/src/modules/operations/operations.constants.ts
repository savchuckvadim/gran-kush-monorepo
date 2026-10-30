export const OPERATIONS_QUEUE_NAME = "operations" as const;

export const OPERATIONS_JOB_NAMES = {
    /** Одна задача — одна операция; данные задачи — только её id */
    RUN: "run",
} as const;

/** Параллельных операций на инстанс API: выгрузки и подачи тяжёлые, им не место рядом с доставкой событий */
export const OPERATIONS_CONCURRENCY = 2;

/** Ключ метаданных `@BackgroundOperation` на обработчике маршрута */
export const BACKGROUND_OPERATION_METADATA = "operations:background" as const;

/** Ключ метаданных `@RunsOperation` на классе исполнителя */
export const OPERATION_RUNNER_METADATA = "operations:runner" as const;
