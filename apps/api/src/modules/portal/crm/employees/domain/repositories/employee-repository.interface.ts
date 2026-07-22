import { EmployeeRole } from "@prisma/client";

import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

export interface EmployeeFilters {
    role?: EmployeeRole;
    isActive?: boolean;
}

export interface EmployeeProfileField {
    fieldKey: string;
    type: string;
    label: string | null;
    value: unknown;
}

export interface EmployeeWithProfile {
    employee: Employee;
    fields: EmployeeProfileField[];
}

export abstract class EmployeeRepository {
    abstract findByIdForPortal(id: string, portalId: string): Promise<EmployeeWithProfile | null>;
    abstract findByUserAndPortal(
        userId: string,
        portalId: string
    ): Promise<EmployeeWithProfile | null>;
    abstract findAllByPortal(
        portalId: string,
        filters?: EmployeeFilters,
        limit?: number,
        skip?: number
    ): Promise<EmployeeWithProfile[]>;
    abstract countByPortal(portalId: string, filters?: EmployeeFilters): Promise<number>;
    abstract createWithProfile(data: {
        userId: string;
        portalId: string;
        role: EmployeeRole;
        invitationId?: string;
        fields: Record<string, unknown>;
    }): Promise<EmployeeWithProfile>;
    abstract updateBridge(
        id: string,
        data: Partial<{
            role: EmployeeRole;
            isActive: boolean;
            lastLoginAt: Date;
        }>
    ): Promise<EmployeeWithProfile>;
    abstract updateProfileFields(
        id: string,
        portalId: string,
        fields: Record<string, unknown>
    ): Promise<EmployeeWithProfile>;
}
