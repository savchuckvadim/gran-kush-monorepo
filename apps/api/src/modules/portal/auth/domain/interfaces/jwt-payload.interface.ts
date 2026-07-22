/**
 * Единый payload access/refresh JWT для member и employee.
 * Токен глобальный (без portalId): портал резолвится из X-Portal-* заголовков,
 * membership проверяет MembershipGuard.
 */
export type AuthPrincipalType = "member" | "employee";

export interface AuthJwtPayload {
    /** User id (глобальный аккаунт) */
    sub: string;
    email: string;
    type: AuthPrincipalType;
}
