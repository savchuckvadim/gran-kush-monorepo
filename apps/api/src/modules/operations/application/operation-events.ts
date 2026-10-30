import { employeeActor, type NewDomainEvent } from "@modules/events";

import type { Operation } from "../domain/operation";

/** Автор операции — её actor и единственный адресат: событие уходит только в его комнату. */
const envelopeOf = (operation: Operation) => ({
    portalId: operation.portalId,
    actor: employeeActor(operation.requestedByEmployeeId),
    aggregateId: operation.id,
});

const payloadOf = (operation: Operation) => ({
    operationId: operation.id,
    kind: operation.kind,
    employeeId: operation.requestedByEmployeeId,
});

export const operationFinishedEvent = (
    operation: Operation
): NewDomainEvent<"operation.finished"> => ({
    name: "operation.finished",
    ...envelopeOf(operation),
    payload: payloadOf(operation),
});

export const operationFailedEvent = (
    operation: Operation,
    errorCode: string
): NewDomainEvent<"operation.failed"> => ({
    name: "operation.failed",
    ...envelopeOf(operation),
    payload: { ...payloadOf(operation), errorCode },
});
