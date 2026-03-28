import { Injectable } from "@nestjs/common";

import { Employee } from "@employees/domain/entity/employee.entity";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";

import { PrismaService } from "@common/prisma/prisma.service";
import { mapToEntity } from "@modules/employees/lib";

@Injectable()
export class EmployeePrismaRepository implements EmployeeRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findById(id: string): Promise<Employee | null> {
        const employee = await this.prisma.employee.findUnique({
            where: { id },
            include: { user: true },
        });
        return employee ? mapToEntity(employee, employee.user) : null;
    }

    async findByUserId(userId: string): Promise<Employee | null> {
        const employee = await this.prisma.employee.findUnique({
            where: { userId },
            include: { user: true },
        });
        return employee ? mapToEntity(employee, employee.user) : null;
    }

    async findByEmail(email: string): Promise<Employee | null> {
        const user = await this.prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { employee: true },
        });
        if (!user || !user.employee) {
            return null;
        }
        return mapToEntity(user.employee, user);
    }

    async findAll(limit?: number, skip?: number): Promise<Employee[]> {
        const employees = await this.prisma.employee.findMany({
            take: limit,
            skip: skip,
            include: { user: true },
            orderBy: { createdAt: "desc" },
        });
        return employees.map((emp) => mapToEntity(emp, emp.user));
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
        return mapToEntity(employee, employee.user);
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
        return mapToEntity(employee, employee.user);
    }
}
