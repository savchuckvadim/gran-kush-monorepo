import type {
    SchemaCreateEmployeeDto,
    SchemaCreateEmployeeResponseDto,
    SchemaEmployeeListItemDto,
    SchemaPaginatedResponseEmployeeListItemDto,
    SchemaUpdateEmployeeDto,
} from "@workspace/api-client/core";
import { assertOpenApiOk } from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export type Employee = SchemaEmployeeListItemDto;
export type EmployeeRole = Employee["role"];
export type EmployeesPage = SchemaPaginatedResponseEmployeeListItemDto;
export type CreateEmployeePayload = SchemaCreateEmployeeDto;
export type CreatedEmployee = SchemaCreateEmployeeResponseDto;
/** Должность и отдел — динамические поля профиля: едут внутри `fields` */
export type UpdateEmployeePayload = SchemaUpdateEmployeeDto;

export interface EmployeeFilters {
    role?: EmployeeRole;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export async function getEmployees(filters?: EmployeeFilters): Promise<EmployeesPage> {
    const response = await $api.GET("/crm/employees", {
        params: {
            query: {
                page: filters?.page ?? 1,
                limit: filters?.limit ?? DEFAULT_PAGE_SIZE,
                role: filters?.role,
                isActive: filters?.isActive,
            },
        },
    });
    return assertOpenApiOk<EmployeesPage>(response);
}

export async function getEmployee(id: string): Promise<Employee> {
    const response = await $api.GET("/crm/employees/{id}", { params: { path: { id } } });
    return assertOpenApiOk<Employee>(response);
}

/**
 * Сотрудник по email. Аккаунта нет — он создаётся без пароля, и сотрудник задаёт пароль сам,
 * регистрируясь с этим адресом. Письмо API не шлёт; уже существующий аккаунт зовут приглашением (409).
 */
export async function createEmployee(body: CreateEmployeePayload): Promise<CreatedEmployee> {
    const response = await $api.POST("/crm/employees", { body });
    return assertOpenApiOk<CreatedEmployee>(response);
}

export async function updateEmployee(id: string, body: UpdateEmployeePayload): Promise<Employee> {
    const response = await $api.PATCH("/crm/employees/{id}", {
        params: { path: { id } },
        body,
    });
    return assertOpenApiOk<Employee>(response);
}

/** Снимает доступ к CRM клуба; вернуть его — `updateEmployee(id, { isActive: true })`. */
export async function deactivateEmployee(id: string): Promise<Employee> {
    const response = await $api.DELETE("/crm/employees/{id}", { params: { path: { id } } });
    return assertOpenApiOk<Employee>(response);
}
