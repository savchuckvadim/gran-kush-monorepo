import { Injectable } from "@nestjs/common";

import { Employee } from "@employees/domain/entity/employee.entity";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";

@Injectable()
export class EmployeePrismaRepository implements EmployeeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<Employee | null> {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: { user: true },
        });
        return employee ? this.mapToEntity(employee, employee.user) : null;
    }

    async findByUserId(userId: string): Promise<Employee | null> {
        const employee = await this.prisma.employee.findUnique({
            where: { userId },
            include: { user: true },
        });
        return employee ? this.mapToEntity(employee, employee.user) : null;
    }

    async findByEmail(email: string): Promise<Employee | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { employee: true },
        });
        if (!user || !user.employee) {
            return null;
        }
        return this.mapToEntity(user.employee, user);
    }

    async findAll(limit?: number, skip?: number): Promise<Employee[]> {
        const employees = await this.prisma.employee.findMany({
            take: limit,
            skip: skip,
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });
        return employees.map((emp) => this.mapToEntity(emp, emp.user));
    }

    async count(): Promise<number> {
        return this.prisma.employee.count();
    }

    async create(data: {
        userId: string;
        portalId?: string;
        name: string;
        surname?: string;
        phone?: string;
        role?: string;
        position?: string;
        department?: string;
    }): Promise<Employee> {
        const employee = await this.prisma.employee.create({
            data,
            include: { user: true },
        });
        return this.mapToEntity(employee, employee.user);
    }

    async update(
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
    ): Promise<Employee> {
        const employee = await this.prisma.employee.update({
            where: { id },
            data,
            include: { user: true },
        });
        return this.mapToEntity(employee, employee.user);
    }

    private mapToEntity(
        employee: {
            id: string;
            userId: string;
            portalId: string | null;
            name: string;
            surname: string | null;
            phone: string | null;
            role: string;
            position: string | null;
            department: string | null;
            isActive: boolean;
            lastLoginAt: Date | null;
            createdAt: Date;
            updatedAt: Date;
        },
        user: {
            id: string;
            email: string;
            passwordHash: string;
        }
    ): Employee {
        return new Employee({
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
    }
}
