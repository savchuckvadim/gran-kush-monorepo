import { ContentLocale, resolveLabel } from "@common/i18n";
import { toEmployeeRoleDto } from "@modules/portal/crm/access/api/mappers/portal-role.mapper";
import { EmployeeListItemDto } from "@modules/portal/crm/employees/api/dto/employee-list.dto";
import { EmployeeWithProfile } from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";

/**
 * Маппинг сотрудника с профилем (EAV) → EmployeeListItemDto (для списка и карточки).
 */
export function mapEmployeeToListDto(
    e: EmployeeWithProfile,
    locale: ContentLocale
): EmployeeListItemDto {
    return {
        id: e.employee.id,
        userId: e.employee.userId,
        email: e.employee.email,
        role: toEmployeeRoleDto(e.employee.role),
        isActive: e.employee.isActive,
        fields: e.fields.map((field) => ({
            fieldKey: field.fieldKey,
            type: field.type,
            label: resolveLabel(field, locale),
            value: field.value,
        })),
        lastLoginAt: e.employee.lastLoginAt,
        createdAt: e.employee.createdAt,
        updatedAt: e.employee.updatedAt,
    };
}
