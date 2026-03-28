import { Employee as PrismaEmployee, User } from "@prisma/client";

import { Employee } from "@modules/employees/domain/entity/employee.entity";

export function mapToEntity(employee: PrismaEmployee, user: User): Employee {
    const employeeEntity = new Employee({
        id: employee.id,
        userId: employee.userId,
        portalId: employee.portalId || undefined,
        email: user.email,
        passwordHash: user.passwordHash,
        name: employee.name,
        surname: employee.surname || undefined,
        phone: employee.phone || undefined,
        role: employee.role,
        position: employee.position || undefined,
        department: employee.department || undefined,
        isActive: employee.isActive,
        lastLoginAt: employee.lastLoginAt || undefined,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
    });
    return employeeEntity;
}
