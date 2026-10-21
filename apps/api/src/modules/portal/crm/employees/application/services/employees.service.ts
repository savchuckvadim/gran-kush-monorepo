import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import { AccountOwnershipService } from "@users/application/services/account-ownership.service";
import { AccountProvisioningService } from "@users/application/services/account-provisioning.service";

import type { PortalPrincipal } from "@common/portal";
import { employeeActor, userActor } from "@modules/events";
import { PortalRolesService } from "@modules/portal/crm/access/application/services/portal-roles.service";
import type { Permission } from "@modules/portal/crm/access/domain/permissions";
import { effectivePermissions, isOwnerRole } from "@modules/portal/crm/access/domain/portal-role";
import { coversPermissions } from "@modules/portal/crm/access/domain/role-assignment-policy";
import {
    EmployeeFilters,
    EmployeeRepository,
    EmployeeWithProfile,
} from "@modules/portal/crm/employees/domain/repositories/employee-repository.interface";
import { DynamicPayloadValidatorService } from "@modules/portal/crm/entity-fields/application/services/dynamic-payload-validator.service";
import { ENTITY_DEFINITION_CODES } from "@modules/portal/crm/entity-fields/constants/entity-definition-codes";

import { employeeAccessChangedEvent, employeeJoinedEvent } from "../events/employee-events";

/** Machine-readable 409 reason: the CRM answers it with a hint to send an invitation. */
export const EMPLOYEE_CONFLICT_CODES = { accountExists: "account_exists" } as const;

/** Кто меняет команду: его сотрудник и права в этом клубе. */
export interface EmployeeActor {
    employeeId: string;
    permissions: readonly Permission[];
}

export const toEmployeeActor = (principal: PortalPrincipal): EmployeeActor => ({
    employeeId: principal.membershipId,
    permissions: principal.permissions,
});

export interface CreateEmployeeInput {
    email: string;
    /** Ключ роли клуба */
    role: string;
    fields: Record<string, unknown>;
}

@Injectable()
export class EmployeesService {
    constructor(
        private readonly employeeRepository: EmployeeRepository,
        private readonly accountProvisioning: AccountProvisioningService,
        private readonly ownership: AccountOwnershipService,
        private readonly roles: PortalRolesService,
        private readonly fieldsValidator: DynamicPayloadValidatorService
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
     * Сотрудник по email из CRM: если аккаунта нет — создаётся pending_claim (пользователь клеймит его
     * позже, задав пароль по письму). Аккаунт, у которого уже есть владелец, напрямую не прикрепляется:
     * его согласие даёт только принятое приглашение (TASK-702). Роль — не шире прав того, кто добавляет.
     */
    async create(
        input: CreateEmployeeInput,
        portalId: string,
        actor: EmployeeActor
    ): Promise<{ employee: EmployeeWithProfile; isNewUser: boolean }> {
        const role = await this.roles.requireAssignable(portalId, input.role, actor.permissions);
        const fields = await this.validFields(portalId, input.fields);

        const { user, isNewUser } = await this.accountProvisioning.ensurePendingClaimUser(
            input.email
        );
        if (!isNewUser && this.ownership.isClaimed(user)) {
            throw new ConflictException({
                message: "This email already has an account. Send an invitation instead",
                code: EMPLOYEE_CONFLICT_CODES.accountExists,
            });
        }

        const employee = await this.employeeRepository.createWithProfile(
            { userId: user.id, portalId, roleId: role.id, fields },
            (created) => [employeeJoinedEvent(created.employee, employeeActor(actor.employeeId))]
        );

        return { employee, isNewUser };
    }

    /**
     * Сотрудник по принятому приглашению. Роль проверена, когда приглашение выдавали; владелец
     * аккаунта доказан при принятии.
     */
    async createFromInvitation(
        input: {
            userId: string;
            roleId: string;
            invitationId: string;
            fields: Record<string, unknown>;
        },
        portalId: string
    ): Promise<EmployeeWithProfile> {
        const fields = await this.validFields(portalId, input.fields);
        return this.employeeRepository.createWithProfile(
            {
                userId: input.userId,
                portalId,
                roleId: input.roleId,
                invitationId: input.invitationId,
                fields,
            },
            (created) => [employeeJoinedEvent(created.employee, userActor(input.userId))]
        );
    }

    async updateEmployee(
        id: string,
        portalId: string,
        actor: EmployeeActor,
        data: {
            role?: string;
            isActive?: boolean;
            fields?: Record<string, unknown>;
        }
    ): Promise<EmployeeWithProfile> {
        await this.requireManageable(id, portalId, actor);
        const role =
            data.role === undefined
                ? undefined
                : await this.roles.requireAssignable(portalId, data.role, actor.permissions);

        const fields = await this.validFields(portalId, data.fields);
        if (Object.keys(fields).length > 0) {
            await this.employeeRepository.updateProfileFields(id, portalId, fields);
        }

        if (role !== undefined || data.isActive !== undefined) {
            return this.employeeRepository.updateBridge(
                id,
                {
                    ...(role !== undefined ? { roleId: role.id } : {}),
                    ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
                },
                (updated) => [employeeAccessChangedEvent(updated.employee, actor.employeeId)]
            );
        }

        return this.findByIdInPortal(id, portalId);
    }

    async deactivateEmployee(
        id: string,
        portalId: string,
        actor: EmployeeActor
    ): Promise<EmployeeWithProfile> {
        await this.requireManageable(id, portalId, actor);
        return this.employeeRepository.updateBridge(id, { isActive: false }, (updated) => [
            employeeAccessChangedEvent(updated.employee, actor.employeeId),
        ]);
    }

    async touchLastLogin(id: string): Promise<void> {
        await this.employeeRepository.updateBridge(id, { lastLoginAt: new Date() });
    }

    /**
     * Коллегу можно менять, если это не ты сам, не владелец и его роль целиком в пределах твоих прав:
     * менеджер с правом на команду не снимет и не отключит админа.
     */
    private async requireManageable(
        id: string,
        portalId: string,
        actor: EmployeeActor
    ): Promise<EmployeeWithProfile> {
        const target = await this.findByIdInPortal(id, portalId);
        if (id === actor.employeeId) {
            throw new BadRequestException("Cannot modify your own account via this endpoint");
        }
        if (isOwnerRole(target.employee.role)) {
            throw new ForbiddenException("Cannot modify portal owner");
        }
        if (!coversPermissions(actor.permissions, effectivePermissions(target.employee.role))) {
            throw new ForbiddenException("This employee has permissions you do not have");
        }
        return target;
    }

    /**
     * Поля профиля — через тот же валидатор, что анкета участника: известные поля, тип, опции и
     * потолки длины. Без него форма сотрудника и публичное принятие приглашения писали что угодно.
     */
    private async validFields(
        portalId: string,
        fields: Record<string, unknown> | undefined
    ): Promise<Record<string, unknown>> {
        if (!fields || Object.keys(fields).length === 0) return {};
        return this.fieldsValidator.validatePartialUpdate(
            portalId,
            ENTITY_DEFINITION_CODES.EMPLOYEE,
            fields
        );
    }
}
