import { UserWithMemberships } from "@users/domain/entity/user.entity";

import { EmployeeInfoDto } from "@modules/portal/auth/employees/api/dto/employee-auth-response.dto";
import { toEmployeeRoleDto } from "@modules/portal/crm/access/api/mappers/portal-role.mapper";

/** Аккаунт CRM в ответе входа: клубы, где он активный сотрудник, и роль в каждом. */
export const toEmployeeInfo = (user: UserWithMemberships): EmployeeInfoDto => ({
    id: user.id,
    email: user.email,
    portals: user.employees
        .filter((employee) => employee.isActive)
        .map((employee) => ({
            portalId: employee.portalId,
            role: toEmployeeRoleDto(employee.role),
        })),
});
