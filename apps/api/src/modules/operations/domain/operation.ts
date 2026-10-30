export type JsonValue =
    | string
    | number
    | boolean
    | null
    | JsonValue[]
    | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export const OPERATION_STATUSES = ["queued", "running", "done", "failed"] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

/** После этих статусов строка больше не меняется. */
export const isOperationSettled = (status: OperationStatus): boolean =>
    status === "done" || status === "failed";

/**
 * Вид операции — один объект для маршрута и для исполнителя: `@BackgroundOperation(definition)`
 * на обработчике маршрута и `@RunsOperation(definition)` на классе связаны одним `kind`, а типы
 * входа и результата выводятся из него. `types` нужен только компилятору, значения у него нет.
 */
export interface OperationDefinition<
    I extends JsonObject = JsonObject,
    R extends JsonObject = JsonObject,
> {
    /** `<модуль>.<действие>`: `finance.export_books`; хранится в строке и уходит в события */
    readonly kind: string;
    readonly description: string;
    readonly types?: { input: I; result: R };
}

export const defineOperation = <I extends JsonObject, R extends JsonObject>(definition: {
    kind: string;
    description: string;
}): OperationDefinition<I, R> => definition;

export type OperationInput<D> = D extends OperationDefinition<infer I, JsonObject> ? I : never;
export type OperationResult<D> = D extends OperationDefinition<JsonObject, infer R> ? R : never;

/** От чьего имени и в каком клубе идёт операция: воркер работает без запроса и без сессии. */
export interface OperationContext {
    operationId: string;
    portalId: string;
    employeeId: string;
}

/**
 * Исполнитель операции — тот же use case, что маршрут выполнил бы синхронно. Права и DTO уже
 * проверены в запросе; исполнитель получает чистый вход и контекст автора. Доменная ошибка
 * (`HttpException` с `code`) становится причиной сбоя, любая другая — `operation_failed`.
 */
export interface OperationRunner<D extends OperationDefinition = OperationDefinition> {
    run(input: OperationInput<D>, context: OperationContext): Promise<OperationResult<D>>;
}

export interface Operation {
    id: string;
    portalId: string;
    kind: string;
    status: OperationStatus;
    requestedByEmployeeId: string;
    input: JsonObject;
    result: JsonObject | null;
    error: string | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
}

/** Причины сбоя, которые ставит сам механизм; причина исполнителя — код его доменной ошибки. */
export const OPERATION_FAILURES = {
    /** Исключение без кода или 5xx: внутренности в строку и событие не попадают */
    internal: "operation_failed",
    /** Маршрут объявлен, а класса с `@RunsOperation` для этого `kind` нет */
    noRunner: "operation_runner_missing",
    /** Очередь не приняла задачу: строка закрыта сразу, клиент повторяет позже */
    queueUnavailable: "operation_queue_unavailable",
} as const;

/** Длина колонки `error`: код причины длиннее — ошибка программиста, а не данных. */
export const OPERATION_ERROR_MAX_LENGTH = 80;
