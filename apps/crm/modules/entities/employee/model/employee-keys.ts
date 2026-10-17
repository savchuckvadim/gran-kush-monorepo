import type { EmployeeFilters } from "../api/employee.api";

/**
 * Ключи запросов сотрудников. Всё лежит под `all`: изменение сотрудника одной инвалидацией
 * обновляет и списки, и его карточку.
 */
export const employeeKeys = {
    all: ["employees"] as const,
    lists: () => [...employeeKeys.all, "list"] as const,
    list: (filters?: EmployeeFilters) => [...employeeKeys.lists(), filters] as const,
    details: () => [...employeeKeys.all, "detail"] as const,
    detail: (id: string) => [...employeeKeys.details(), id] as const,
};
