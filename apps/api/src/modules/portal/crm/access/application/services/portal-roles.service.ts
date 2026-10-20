import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from "@nestjs/common";

import type { RoleChangedPart } from "@workspace/domain-events";
import { randomBytes } from "crypto";

import { employeeActor } from "@modules/events";

import { isPermission, Permission } from "../../domain/permissions";
import {
    effectivePermissions,
    isEditableRole,
    isOwnerRole,
    PortalRole,
} from "../../domain/portal-role";
import {
    PortalRoleRepository,
    PortalRoleWithUsage,
} from "../../domain/portal-role-repository.interface";
import { coversPermissions } from "../../domain/role-assignment-policy";

/** Машинные причины отказа: фронт показывает по ним понятный текст. */
export const ROLE_ERROR_CODES = {
    unknownRole: "unknown_role",
    ownerRole: "owner_role",
    exceedsOwnPermissions: "exceeds_own_permissions",
    notEditable: "role_not_editable",
    inUse: "role_in_use",
} as const;

const CUSTOM_KEY_PREFIX = "custom_";
const CUSTOM_KEY_BYTES = 4;

/**
 * Роли клуба: список, свои роли и их права, выбор роли для сотрудника. Правило одно на всё: роль
 * можно выдать или изменить, только если все её права есть у того, кто это делает
 * (`coversPermissions`), — иначе это повышение собственных прав.
 */
@Injectable()
export class PortalRolesService {
    constructor(private readonly roles: PortalRoleRepository) {}

    list(portalId: string): Promise<PortalRoleWithUsage[]> {
        return this.roles.findAllByPortal(portalId);
    }

    /** Роль, которую действующий сотрудник может назначить: из этого клуба, не владелец, не шире его прав. */
    async requireAssignable(
        portalId: string,
        key: string,
        actorPermissions: readonly Permission[]
    ): Promise<PortalRole> {
        const role = await this.roles.findByKey(portalId, key);
        if (!role) {
            throw new BadRequestException({
                message: `Role "${key}" does not exist in this club`,
                code: ROLE_ERROR_CODES.unknownRole,
            });
        }
        if (isOwnerRole(role)) {
            throw new ForbiddenException({
                message: "The owner role cannot be assigned",
                code: ROLE_ERROR_CODES.ownerRole,
            });
        }
        this.assertCovers(actorPermissions, effectivePermissions(role));
        return role;
    }

    async create(
        portalId: string,
        data: { name: string; permissions: string[] },
        actorPermissions: readonly Permission[]
    ): Promise<PortalRole> {
        const permissions = this.validPermissions(data.permissions);
        this.assertCovers(actorPermissions, permissions);
        const key = `${CUSTOM_KEY_PREFIX}${randomBytes(CUSTOM_KEY_BYTES).toString("hex")}`;
        return this.roles.create(portalId, { key, name: data.name.trim(), permissions });
    }

    async update(
        id: string,
        portalId: string,
        data: { name?: string; permissions?: string[] },
        actor: { employeeId: string; permissions: readonly Permission[] }
    ): Promise<PortalRoleWithUsage> {
        const actorPermissions = actor.permissions;
        const role = await this.requireRole(id, portalId);
        if (!isEditableRole(role) || (role.isSystem && data.name !== undefined)) {
            throw new ForbiddenException({
                message: "This role cannot be edited",
                code: ROLE_ERROR_CODES.notEditable,
            });
        }
        // Сужать или расширять можно только роль, которая целиком в пределах своих прав
        this.assertCovers(actorPermissions, effectivePermissions(role));
        const permissions =
            data.permissions === undefined ? undefined : this.validPermissions(data.permissions);
        if (permissions) {
            this.assertCovers(actorPermissions, permissions);
        }
        const changed: RoleChangedPart[] = [
            ...(data.name !== undefined ? (["name"] as const) : []),
            ...(permissions ? (["permissions"] as const) : []),
        ];
        await this.roles.update(
            role.id,
            {
                ...(data.name !== undefined ? { name: data.name.trim() } : {}),
                ...(permissions ? { permissions } : {}),
            },
            changed.length
                ? [
                      {
                          name: "role.changed",
                          portalId,
                          actor: employeeActor(actor.employeeId),
                          aggregateId: role.id,
                          payload: { roleId: role.id, changed },
                      },
                  ]
                : []
        );
        const updated = await this.roles.findWithUsage(role.id, portalId);
        if (!updated) {
            throw new NotFoundException("Role not found");
        }
        return updated;
    }

    async delete(
        id: string,
        portalId: string,
        actorPermissions: readonly Permission[]
    ): Promise<void> {
        const role = await this.requireRole(id, portalId);
        if (role.isSystem) {
            throw new ForbiddenException({
                message: "System roles cannot be deleted",
                code: ROLE_ERROR_CODES.notEditable,
            });
        }
        this.assertCovers(actorPermissions, effectivePermissions(role));
        if (!(await this.roles.deleteUnused(role.id, portalId))) {
            throw new ConflictException({
                message: "The role is assigned to employees or pending invitations",
                code: ROLE_ERROR_CODES.inUse,
            });
        }
    }

    private async requireRole(id: string, portalId: string): Promise<PortalRole> {
        const role = await this.roles.findById(id, portalId);
        if (!role) {
            throw new NotFoundException("Role not found");
        }
        return role;
    }

    private validPermissions(codes: string[]): Permission[] {
        const unknown = codes.filter((code) => !isPermission(code));
        if (unknown.length > 0) {
            throw new BadRequestException(`Unknown permissions: ${unknown.join(", ")}`);
        }
        return [...new Set(codes)] as Permission[];
    }

    private assertCovers(actor: readonly Permission[], required: readonly Permission[]): void {
        if (!coversPermissions(actor, required)) {
            throw new ForbiddenException({
                message: "You cannot grant permissions you do not have",
                code: ROLE_ERROR_CODES.exceedsOwnPermissions,
            });
        }
    }
}
