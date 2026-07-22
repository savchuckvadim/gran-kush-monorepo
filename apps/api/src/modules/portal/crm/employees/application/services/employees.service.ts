import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { EmployeeRole, UserAccountStatus } from "@prisma/client";
import { UserRepository } from "@users/domain/repositories/user-repository.interface";

import {
    EmployeeFilters,
    EmployeeRepository,
    EmployeeWithProfile,
} from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";

export interface CreateEmployeeInput {
    email: string;
    role: EmployeeRole;
    fields: Record<string, unknown>;
    invitationId?: string;
}

@Injectable()
export class EmployeesService {
    constructor(
        private readonly employeeRepository: EmployeeRepository,
        private readonly userRepository: UserRepository
    ) {}

    async findAllByPortal(
        portalId: string,
        filters?: EmployeeFilters,
        limit?: number,
        skip?: number
    ): Promise<EmployeeWithProfile[]> {
        return this.employeeRepository.findAllByPortal(portalId, filters, limit, skip);
    }

    async countByPortal(portalId: string, filters?: EmployeeFilters): Promise<number> {
        return this.employeeRepository.countByPortal(portalId, filters);
    }

    async findByIdInPortal(id: string, portalId: string): Promise<EmployeeWithProfile> {
        const employee = await this.employeeRepository.findByIdForPortal(id, portalId);
        if (!employee) {
            throw new NotFoundException("Employee not found");
        }
        return employee;
    }

    async findByUserAndPortal(
        userId: string,
        portalId: string
    ): Promise<EmployeeWithProfile | null> {
        return this.employeeRepository.findByUserAndPortal(userId, portalId);
    }

    /**
     * Создание сотрудника по email: если аккаунта нет — создаётся pending_claim
     * (пользователь клеймит его позже, установив пароль при регистрации).
     */
    async create(
        input: CreateEmployeeInput,
        portalId: string
    ): Promise<{ employee: EmployeeWithProfile; isNewUser: boolean }> {
        if (input.role === EmployeeRole.portal_owner) {
            throw new ForbiddenException("Cannot assign portal_owner role");
        }

        let user = await this.userRepository.findByEmail(input.email);
        let isNewUser = false;
        if (!user) {
            user = await this.userRepository.create({
                email: input.email,
                passwordHash: null,
                status: UserAccountStatus.pending_claim,
                isActive: false,
                emailConfirmed: false,
            });
            isNewUser = true;
        }

        const employee = await this.employeeRepository.createWithProfile({
            userId: user.id,
            portalId,
            role: input.role,
            invitationId: input.invitationId,
            fields: input.fields,
        });

        return { employee, isNewUser };
    }

    /** Внутренний метод (онбординг портала): создать owner-моста без проверок роли. */
    async createOwner(
        userId: string,
        portalId: string,
        fields: Record<string, unknown>
    ): Promise<EmployeeWithProfile> {
        return this.employeeRepository.createWithProfile({
            userId,
            portalId,
            role: EmployeeRole.portal_owner,
            fields,
        });
    }

    async updateEmployee(
        id: string,
        portalId: string,
        actorId: string,
        data: {
            role?: EmployeeRole;
            isActive?: boolean;
            fields?: Record<string, unknown>;
        }
    ): Promise<EmployeeWithProfile> {
        const target = await this.findByIdInPortal(id, portalId);

        if (id === actorId) {
            throw new BadRequestException("Cannot modify your own account via this endpoint");
        }
        if (target.employee.role === EmployeeRole.portal_owner) {
            throw new ForbiddenException("Cannot modify portal owner");
        }
        if (data.role === EmployeeRole.portal_owner) {
            throw new ForbiddenException("Cannot assign portal_owner role");
        }

        if (data.fields && Object.keys(data.fields).length > 0) {
            await this.employeeRepository.updateProfileFields(id, portalId, data.fields);
        }

        if (data.role !== undefined || data.isActive !== undefined) {
            return this.employeeRepository.updateBridge(id, {
                ...(data.role !== undefined ? { role: data.role } : {}),
                ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
            });
        }

        return this.findByIdInPortal(id, portalId);
    }

    async deactivateEmployee(
        id: string,
        portalId: string,
        actorId: string
    ): Promise<EmployeeWithProfile> {
        const target = await this.findByIdInPortal(id, portalId);

        if (id === actorId) {
            throw new BadRequestException("Cannot deactivate your own account");
        }
        if (target.employee.role === EmployeeRole.portal_owner) {
            throw new ForbiddenException("Cannot deactivate portal owner");
        }

        return this.employeeRepository.updateBridge(id, { isActive: false });
    }

    async touchLastLogin(id: string): Promise<void> {
        await this.employeeRepository.updateBridge(id, { lastLoginAt: new Date() });
    }
}
