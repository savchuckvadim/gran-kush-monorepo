"use client";

import { OWNER_ROLE_KEY, usePermissions } from "@/modules/entities/access";
import type { Employee } from "@/modules/entities/employee";
import { useAuth } from "@/modules/processes";

export interface EmployeeAccess {
    /** Карточка того, кто её открыл */
    isSelf: boolean;
    /** Можно менять роль и доступ */
    canManage: boolean;
}

/**
 * Кто может менять сотрудника — те же правила, что у API (`PATCH`/`DELETE /crm/employees/:id`):
 * право `employees.manage`, не себя и не владельца. Что роль коллеги не шире своих прав, API
 * проверит сам и ответит понятной ошибкой.
 */
export function useEmployeeAccess(employee: Employee): EmployeeAccess {
    const { currentUser } = useAuth();
    const { can } = usePermissions();
    const isSelf = employee.userId === currentUser?.id;
    const isOwner = employee.role.isSystem && employee.role.key === OWNER_ROLE_KEY;

    return { isSelf, canManage: can("employees.manage") && !isSelf && !isOwner };
}
