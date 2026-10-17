import { AuthPrincipalType } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import type { Permission } from "@modules/portal/crm/access/domain/permissions";

/**
 * Результат резолва membership (MembershipGuard):
 * глобальный user + его роль-мост в портале текущего запроса.
 */
export interface PortalPrincipal {
    userId: string;
    email: string;
    portalId: string;
    principalType: AuthPrincipalType;
    /** Member.id или Employee.id */
    membershipId: string;
    /** Профильная EntityRecord моста */
    entityRecordId: string;
    /** Роль сотрудника в клубе; у участника нет */
    roleId?: string;
    roleKey?: string;
    /** Права роли сотрудника (у участника — пусто) */
    permissions: readonly Permission[];
}

/** Есть ли у действующего все перечисленные права. */
export const principalCan = (
    principal: Pick<PortalPrincipal, "permissions">,
    ...required: Permission[]
): boolean => required.every((code) => principal.permissions.includes(code));

declare module "express" {
    interface Request {
        principal?: PortalPrincipal;
        /** Исходный аутентифицированный user (до подмены req.user bridge-сущностью) */
        authUser?: unknown;
    }
}
