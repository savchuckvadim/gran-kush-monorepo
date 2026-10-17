import { PERMISSION_GROUPS } from "../../domain/permissions";
import {
    effectivePermissions,
    isEditableRole,
    isOwnerRole,
    PortalRole,
} from "../../domain/portal-role";
import type { PortalRoleWithUsage } from "../../domain/portal-role-repository.interface";
import type { EmployeeRoleDto, PermissionGroupDto, PortalRoleDto } from "../dto/portal-role.dto";

export const toPortalRoleDto = (role: PortalRoleWithUsage): PortalRoleDto => ({
    id: role.id,
    key: role.key,
    name: role.name,
    isSystem: role.isSystem,
    isEditable: isEditableRole(role),
    isAssignable: !isOwnerRole(role),
    permissions: effectivePermissions(role),
    employeeCount: role.employeeCount,
});

export const toEmployeeRoleDto = (
    role: Pick<PortalRole, "id" | "key" | "name" | "isSystem">
): EmployeeRoleDto => ({
    id: role.id,
    key: role.key,
    name: role.name,
    isSystem: role.isSystem,
});

export const permissionCatalogDto = (): PermissionGroupDto[] =>
    PERMISSION_GROUPS.map((group) => ({ key: group.key, permissions: [...group.permissions] }));
