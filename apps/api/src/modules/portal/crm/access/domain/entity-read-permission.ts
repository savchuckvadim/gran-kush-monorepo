import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

import { Permission, PERMISSIONS } from "./permissions";

/**
 * Записи системных сущностей видны и через общий API смарт-процессов. Чтобы он не обходил права
 * раздела, чтение участника, сотрудника или заказа там требует права самого раздела (TASK-731).
 */
const SYSTEM_ENTITY_READ: Readonly<Record<string, Permission>> = {
    [ENTITY_DEFINITION_CODES.MEMBER]: PERMISSIONS.MembersRead,
    [ENTITY_DEFINITION_CODES.EMPLOYEE]: PERMISSIONS.EmployeesRead,
    [ENTITY_DEFINITION_CODES.ORDER]: PERMISSIONS.OrdersRead,
};

export const entityReadPermission = (code: string): Permission | undefined =>
    SYSTEM_ENTITY_READ[code];
