import type { NewDomainEvent } from "@modules/events";

import type { JsonObject, Operation } from "../operation";

export interface NewOperation {
    portalId: string;
    kind: string;
    requestedByEmployeeId: string;
    input: JsonObject;
    /** sha256 канонизированного входа — сравнение повтора по ключу */
    inputHash: string;
    idempotencyKey: string | null;
}

/**
 * `existing` — тот же `Idempotency-Key` уже завёл операцию с тем же входом (повтор клиента);
 * `mismatch` — тот же ключ с другим входом: ошибка клиента, а не повтор.
 */
export type CreateOperationOutcome =
    | { kind: "created"; operation: Operation }
    | { kind: "existing"; operation: Operation }
    | { kind: "mismatch" };

/** Строки операций: заведение с дедупликацией по ключу, переходы статуса и чтение автором. */
export abstract class OperationRepository {
    abstract create(input: NewOperation): Promise<CreateOperationOutcome>;

    abstract findById(id: string): Promise<Operation | null>;

    /** Операцию видят только её клуб и её автор: чужому клубу и коллеге строки нет. */
    abstract findForRequester(
        id: string,
        portalId: string,
        employeeId: string
    ): Promise<Operation | null>;

    /** `queued` → `running` одним условным UPDATE; `null` — операцию уже взяли или завершили. */
    abstract start(id: string): Promise<Operation | null>;

    /** Итог и события — одной транзакцией: событие без итога или итог без события невозможны. */
    abstract finish(
        id: string,
        result: JsonObject | null,
        events: readonly NewDomainEvent[]
    ): Promise<void>;

    abstract fail(id: string, error: string, events: readonly NewDomainEvent[]): Promise<void>;
}
