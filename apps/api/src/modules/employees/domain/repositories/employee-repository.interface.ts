import { Employee } from "@employees/domain/entity/employee.entity";

export abstract class EmployeeRepository {
    abstract findById(id: string): Promise<Employee | null>;
    abstract findByEmail(email: string): Promise<Employee | null>;
    abstract findAll(limit?: number, skip?: number): Promise<Employee[]>;
    abstract count(): Promise<number>;
    abstract create(data: {
        userId: string;
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
