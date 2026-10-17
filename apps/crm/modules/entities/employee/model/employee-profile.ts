import { fieldValueText } from "@/modules/shared/lib/field-value-text";
import { personName } from "@/modules/shared/lib/person-name";

import type { Employee } from "../api/employee.api";

/** Поля профиля, которые есть у каждого сотрудника (динамические поля сущности `employee`). */
export const EMPLOYEE_FIELD = {
    firstName: "first_name",
    lastName: "last_name",
    phone: "phone",
    position: "position",
    department: "department",
} as const;

/** Текст поля профиля; пустое поле — `null`. */
export const employeeFieldText = (employee: Employee, fieldKey: string): string | null =>
    fieldValueText(employee.fields.find((field) => field.fieldKey === fieldKey)?.value);

/** «Имя Фамилия», а пока имени в профиле нет — email. */
export const employeeName = (employee: Employee): string =>
    personName(
        {
            name: employeeFieldText(employee, EMPLOYEE_FIELD.firstName) ?? "",
            surname: employeeFieldText(employee, EMPLOYEE_FIELD.lastName),
        },
        employee.email
    );
