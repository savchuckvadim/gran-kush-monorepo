import type {
    SchemaEmployeeListItemDto,
    SchemaPaginatedResponseEmployeeListItemDto,
} from "@workspace/api-client/core";

import { $api } from "@/modules/shared";

export interface EmployeeFilters {
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
}

/** Зеркало UpdateEmployeeDto: должность и отдел — динамические поля, едут внутри fields */
export interface UpdateEmployeePayload {
    role?: string;
    isActive?: boolean;
    fields?: Record<string, unknown>;
}

// Endpoints are not yet regenerated in the OpenAPI schema.
// Using fetch via $api with `as never` for the path and `as unknown as TYPE` for data.

export async function getEmployees(
    filters?: EmployeeFilters
): Promise<SchemaPaginatedResponseEmployeeListItemDto> {
    const query: Record<string, unknown> = {
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 20,
    };
    if (filters?.role !== undefined) query.role = filters.role;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;

    const response = await $api.GET("/crm/employees" as never, {
        params: { query },
    } as never);

    if (!response.response.ok) {
        throw new Error(`Failed to fetch employees: ${response.response.status}`);
    }

    return response.data as unknown as SchemaPaginatedResponseEmployeeListItemDto;
}

export async function getEmployee(id: string): Promise<SchemaEmployeeListItemDto> {
    const response = await $api.GET("/crm/employees/{id}" as never, {
        params: { path: { id } },
    } as never);

    if (!response.response.ok) {
        throw new Error(`Failed to fetch employee: ${response.response.status}`);
    }

    return response.data as unknown as SchemaEmployeeListItemDto;
}

export async function updateEmployee(
    id: string,
    data: UpdateEmployeePayload
): Promise<SchemaEmployeeListItemDto> {
    const response = await $api.PATCH("/crm/employees/{id}" as never, {
        params: { path: { id } },
        body: data,
    } as never);

    if (!response.response.ok) {
        throw new Error(`Failed to update employee: ${response.response.status}`);
    }

    return response.data as unknown as SchemaEmployeeListItemDto;
}

export async function deactivateEmployee(id: string): Promise<SchemaEmployeeListItemDto> {
    const response = await $api.DELETE("/crm/employees/{id}" as never, {
        params: { path: { id } },
    } as never);

    if (!response.response.ok) {
        throw new Error(`Failed to deactivate employee: ${response.response.status}`);
    }

    return response.data as unknown as SchemaEmployeeListItemDto;
}
