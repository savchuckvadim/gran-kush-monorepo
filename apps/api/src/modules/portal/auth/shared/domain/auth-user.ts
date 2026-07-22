import { AuthPrincipalType } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";

/**
 * Аутентифицированный глобальный аккаунт (результат JWT-стратегии, до резолва membership).
 * Для портальных эндпоинтов MembershipGuard заменяет req.user на bridge-сущность
 * (Member/Employee), а этот объект сохраняет в req.authUser.
 */
export interface AuthenticatedUser {
    kind: "authenticated_user";
    userId: string;
    email: string;
    principalType: AuthPrincipalType;
    emailConfirmed: boolean;
    isActive: boolean;
}

export const isAuthenticatedUser = (value: unknown): value is AuthenticatedUser =>
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "authenticated_user";
