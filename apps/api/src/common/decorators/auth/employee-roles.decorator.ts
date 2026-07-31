import { SetMetadata } from "@nestjs/common";

import { EmployeeRole } from "@prisma/client";

export const EMPLOYEE_ROLES_KEY = "employeeRoles";

/** Разрешённые роли Employee-моста для handler'а. Читается EmployeeRolesGuard. */
export const EmployeeRoles = (...roles: EmployeeRole[]) => SetMetadata(EMPLOYEE_ROLES_KEY, roles);

/** manager и выше: рутинные write-операции CRM. */
export const MANAGER_ROLES: readonly EmployeeRole[] = [
    EmployeeRole.portal_owner,
    EmployeeRole.admin,
    EmployeeRole.manager,
];
