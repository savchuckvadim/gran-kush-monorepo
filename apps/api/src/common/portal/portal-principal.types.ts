import { EmployeeRole } from "@prisma/client";

import { AuthPrincipalType } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";

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
    /** Только для employee */
    role?: EmployeeRole;
}

declare module "express" {
    interface Request {
        principal?: PortalPrincipal;
        /** Исходный аутентифицированный user (до подмены req.user bridge-сущностью) */
        authUser?: unknown;
    }
}
