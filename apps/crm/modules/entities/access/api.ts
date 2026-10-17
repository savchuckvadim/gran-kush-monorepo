import {
    assertOpenApiOk,
    type SchemaCreatePortalRoleDto,
    type SchemaEmployeeRoleDto,
    type SchemaPermission,
    type SchemaPortalRoleDto,
    type SchemaPortalRolesResponseDto,
    type SchemaUpdatePortalRoleDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

/** Код права сотрудника из каталога API (`members.read`, `orders.process`, …). */
export type Permission = SchemaPermission;
export type PortalRole = SchemaPortalRoleDto;
/** Роль в карточке сотрудника и приглашении: без прав, только чтобы назвать её. */
export type EmployeeRoleRef = SchemaEmployeeRoleDto;
export type PortalRoles = SchemaPortalRolesResponseDto;

export const OWNER_ROLE_KEY = "owner";

/** Права, за которыми стоит хотя бы один раздел настроек: без них «Настройки» в меню не нужны. */
export const SETTINGS_PERMISSIONS: readonly Permission[] = [
    "members.invite",
    "catalog.manage",
    "employees.manage",
    "roles.manage",
    "settings.club",
    "settings.structure",
    "billing.manage",
];

export async function getPortalRoles(): Promise<PortalRoles> {
    const response = await $api.GET("/crm/settings/roles");
    return assertOpenApiOk<PortalRoles>(response);
}

export async function createPortalRole(body: SchemaCreatePortalRoleDto): Promise<PortalRole> {
    const response = await $api.POST("/crm/settings/roles", { body });
    return assertOpenApiOk<PortalRole>(response);
}

export async function updatePortalRole(
    id: string,
    body: SchemaUpdatePortalRoleDto
): Promise<PortalRole> {
    const response = await $api.PATCH("/crm/settings/roles/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<PortalRole>(response);
}

export async function deletePortalRole(id: string): Promise<void> {
    const response = await $api.DELETE("/crm/settings/roles/{id}", { params: { path: { id } } });
    assertOpenApiOk(response);
}
