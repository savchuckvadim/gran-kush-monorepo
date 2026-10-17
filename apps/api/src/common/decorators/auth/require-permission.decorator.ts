import { SetMetadata } from "@nestjs/common";

import type { Permission } from "@modules/portal/crm/access/domain/permissions";

export const REQUIRED_PERMISSIONS_KEY = "requiredPermissions";

/**
 * Нужные права сотрудника. Проверяет `PermissionGuard` из `RequireEmployeeJwt`; на классе и
 * обработчике права складываются. Роль в коде не проверяем — только права (AUTH_ARCHITECTURE §4).
 */
export const RequirePermission = (...permissions: Permission[]) =>
    SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
