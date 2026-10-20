import type { EventActor } from "@workspace/domain-events";

import { employeeActor, type NewDomainEvent } from "@modules/events";
import type { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

/*
 * События команды клуба (packages/domain-events/src/catalog/employee.events.ts). По
 * `employee.access_changed` realtime-шлюз пересобирает комнаты сотрудника: отнятое право
 * перестаёт приносить события сразу.
 */

/** Аккаунт стал сотрудником: основатель, принятое приглашение или добавлен сотрудником. */
export const employeeJoinedEvent = (employee: Employee, actor: EventActor): NewDomainEvent => ({
    name: "employee.joined",
    portalId: employee.portalId,
    actor,
    aggregateId: employee.id,
    payload: { employeeId: employee.id, userId: employee.userId, roleId: employee.roleId },
});

export const employeeAccessChangedEvent = (
    employee: Employee,
    actorEmployeeId: string
): NewDomainEvent => ({
    name: "employee.access_changed",
    portalId: employee.portalId,
    actor: employeeActor(actorEmployeeId),
    aggregateId: employee.id,
    payload: {
        employeeId: employee.id,
        userId: employee.userId,
        roleId: employee.roleId,
        isActive: employee.isActive,
    },
});
