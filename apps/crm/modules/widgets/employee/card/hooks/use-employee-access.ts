"use client";

import type { Employee } from "@/modules/entities/employee";
import { usePortalRole } from "@/modules/entities/portal";
import { useAuth } from "@/modules/processes";

export interface EmployeeAccess {
    /** Карточка того, кто её открыл */
    isSelf: boolean;
    /** Можно менять роль и доступ */
    canManage: boolean;
}

/**
 * Кто может менять сотрудника — те же правила, что у API (`PATCH`/`DELETE /crm/employees/:id`):
 * администратор открытого клуба, не себя и не владельца.
 */
export function useEmployeeAccess(employee: Employee): EmployeeAccess {
    const { currentUser } = useAuth();
    const { isAdmin } = usePortalRole();
    const isSelf = employee.userId === currentUser?.id;

    return { isSelf, canManage: isAdmin && !isSelf && employee.role !== "portal_owner" };
}
