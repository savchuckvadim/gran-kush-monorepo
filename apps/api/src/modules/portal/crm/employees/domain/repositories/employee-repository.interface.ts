import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";

export interface EmployeeFilters {
    role?: string;
    isActive?: boolean;
}

export abstract class EmployeeRepository {
    abstract findById(id: string): Promise<Employee | null>;
    abstract findByEmail(email: string): Promise<Employee | null>;
    abstract findAll(limit?: number, skip?: number): Promise<Employee[]>;
    abstract count(): Promise<number>;
    abstract findAllByPortal(
        portalId: string,
        filters?: EmployeeFilters,
        limit?: number,
        skip?: number
    ): Promise<Employee[]>;
    abstract countByPortal(portalId: string, filters?: EmployeeFilters): Promise<number>;
    abstract create(data: {
        userId: string;
        portalId?: string;
        name: string;
        surname?: string;
        phone?: string;
        role?: string;
        position?: string;
        department?: string;
    }): Promise<Employee>;
    abstract update(
        id: string,
        data: Partial<{
            name: string;
            surname: string;
            phone: string;
            role: string;
            position: string;
            department: string;
            isActive: boolean;
            lastLoginAt: Date;
        }>
    ): Promise<Employee>;
}
