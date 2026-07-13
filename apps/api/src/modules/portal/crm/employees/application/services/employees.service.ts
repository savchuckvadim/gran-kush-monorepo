import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import * as bcrypt from "bcrypt";

import { Employee } from "@modules/portal/crm/employees/domain/entity/employee.entity";
import {
    EmployeeFilters,
    EmployeeRepository,
} from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";

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
    async findAll(limit?: number, skip?: number): Promise<Employee[]> {
        return this.employeeRepository.findAll(limit, skip);
    }

    /**
     * Получить общее количество сотрудников
     */
    async count(): Promise<number> {
        return this.employeeRepository.count();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Portal-scoped CRM methods
    // ═══════════════════════════════════════════════════════════════════════════

    async findAllByPortal(
        portalId: string,
        filters?: EmployeeFilters,
        limit?: number,
        skip?: number
    ): Promise<Employee[]> {
        return this.employeeRepository.findAllByPortal(portalId, filters, limit, skip);
    }

    async countByPortal(portalId: string, filters?: EmployeeFilters): Promise<number> {
        return this.employeeRepository.countByPortal(portalId, filters);
    }

    async findByIdInPortal(id: string, portalId: string): Promise<Employee> {
        const employee = await this.employeeRepository.findById(id);
        if (!employee || employee.portalId !== portalId) {
            throw new NotFoundException(`Employee not found`);
        }
        return employee;
    }

    async updateEmployee(
        id: string,
        portalId: string,
        actorId: string,
        data: Partial<{
            role: string;
            position: string;
            department: string;
            isActive: boolean;
        }>
    ): Promise<Employee> {
        const target = await this.findByIdInPortal(id, portalId);

        if (id === actorId) {
            throw new BadRequestException("Cannot modify your own account via this endpoint");
        }
        if (target.role === "portal_owner") {
            throw new ForbiddenException("Cannot modify portal owner");
        }
        if (data.role === "portal_owner") {
            throw new ForbiddenException("Cannot assign portal_owner role");
        }

        return this.employeeRepository.update(id, data);
    }

    async deactivateEmployee(id: string, portalId: string, actorId: string): Promise<Employee> {
        const target = await this.findByIdInPortal(id, portalId);

        if (id === actorId) {
            throw new BadRequestException("Cannot deactivate your own account");
        }
        if (target.role === "portal_owner") {
            throw new ForbiddenException("Cannot deactivate portal owner");
        }

        return this.employeeRepository.update(id, { isActive: false });
    }
}
