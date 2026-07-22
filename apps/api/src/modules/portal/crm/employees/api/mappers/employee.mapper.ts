import { EmployeeListItemDto } from "@modules/portal/crm/employees/api/dto/employee-list.dto";
import { EmployeeWithProfile } from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";

/**
 * Маппинг сотрудника с профилем (EAV) → EmployeeListItemDto (для списка и карточки).
 */
export function mapEmployeeToListDto(e: EmployeeWithProfile): EmployeeListItemDto {
    return {
        id: e.employee.id,
        userId: e.employee.userId,
        email: e.employee.email,
        role: e.employee.role,
        isActive: e.employee.isActive,
        fields: e.fields,
        lastLoginAt: e.employee.lastLoginAt,
        createdAt: e.employee.createdAt,
        updatedAt: e.employee.updatedAt,
    };
}
