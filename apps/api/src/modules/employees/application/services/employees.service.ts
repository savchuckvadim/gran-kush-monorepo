import { Injectable } from "@nestjs/common";

import { Employee } from "@employees/domain/entity/employee.entity";
import { EmployeeRepository } from "@employees/domain/repositories/employee-repository.interface";
import * as bcrypt from "bcrypt";

@Injectable()
export class EmployeesService {
    constructor(private readonly employeeRepository: EmployeeRepository) {}

    /**
     * Найти сотрудника по email для аутентификации
     */
    async findByEmailForAuth(email: string): Promise<Employee | null> {
        return this.employeeRepository.findByEmail(email);
    }

    /**
     * Найти сотрудника по ID
     */
    async findById(id: string): Promise<Employee | null> {
        return this.employeeRepository.findById(id);
    }

    /**
     * Валидация сотрудника (email и пароль)
     */
    async validateEmployee(email: string, password: string): Promise<Employee | null> {
        const employee = await this.employeeRepository.findByEmail(email);

        if (!employee) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);
        if (!isPasswordValid || !employee.isActive) {
            return null;
        }

        // Обновляем время последнего входа через репозиторий
        await this.employeeRepository.update(employee.id, { lastLoginAt: new Date() });

        return this.employeeRepository.findById(employee.id);
    }

    /**
     * Получить список всех сотрудников
     */
    async findAll(limit?: number): Promise<Employee[]> {
        return this.employeeRepository.findAll(limit);
    }
}
