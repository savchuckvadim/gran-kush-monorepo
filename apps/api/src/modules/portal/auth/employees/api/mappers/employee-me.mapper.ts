import { MemberConsentStatus } from "@prisma/client";
import { UserWithMemberships } from "@users/domain/entity/user.entity";

import { toEmployeeRoleDto } from "@modules/portal/crm/access/api/mappers/portal-role.mapper";
import { effectivePermissions } from "@modules/portal/crm/access/domain/portal-role";

import { EmployeeMeResponseDto } from "../dto/employee-me-response.dto";

/** The CRM account (web and native): employments by club and whether it is also a member somewhere. */
export const toEmployeeMe = (user: UserWithMemberships): EmployeeMeResponseDto => ({
    id: user.id,
    email: user.email,
    emailConfirmed: user.emailConfirmed,
    employments: user.employees.map((e) => ({
        portalId: e.portalId,
        employeeId: e.id,
        role: toEmployeeRoleDto(e.role),
        permissions: effectivePermissions(e.role),
        isActive: e.isActive,
    })),
    // A membership a club created without the owner's consent is not one yet (TASK-703)
    hasMemberships: user.members.some(
        (m) =>
            m.isActive &&
            (m.consentStatus ?? MemberConsentStatus.confirmed) === MemberConsentStatus.confirmed
    ),
});
