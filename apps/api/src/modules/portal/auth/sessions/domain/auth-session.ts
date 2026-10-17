import type { AuthPrincipalType } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";

/**
 * Приложение, в которое вошли (AUTH_ARCHITECTURE §1): CRM сотрудника или кабинет участника. У каждой
 * аудитории свои сессии и куки: вход в CRM на компьютере клуба не открывает личный кабинет.
 */
export const SESSION_AUDIENCES = { Crm: "crm", Cabinet: "cabinet" } as const;
export type SessionAudience = (typeof SESSION_AUDIENCES)[keyof typeof SESSION_AUDIENCES];

/** Для MembershipGuard: в CRM аккаунт — сотрудник клуба, в кабинете — участник. */
export const principalTypeOf = (audience: SessionAudience): AuthPrincipalType =>
    audience === SESSION_AUDIENCES.Crm ? "employee" : "member";

export type SignInMethod =
    | "password"
    | "google"
    | "telegram"
    | "email_link"
    | "invitation"
    | "registration";

export type SessionRevokeReason =
    | "logout"
    | "sign_out_everywhere"
    | "revoked_by_user"
    | "password_changed"
    | "password_reset"
    | "account_claimed"
    | "reuse_detected"
    | "blocked";

/**
 * Две вкладки обновили токен одновременно: вторая пришла с прежним refresh. В пределах этого окна
 * это гонка (браузер уже получил новые куки от первой), позже — повтор украденного токена.
 */
export const REFRESH_REUSE_GRACE_MS = 30_000;

/** Сессия, как её видит владелец в списке устройств. */
export interface AuthSession {
    id: string;
    userId: string;
    audience: SessionAudience;
    deviceId: string;
    signInMethod: SignInMethod;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
}

/** Хеши токенов сессии — только для ротации. */
export interface SessionSecrets {
    refreshTokenHash: string;
    previousTokenHash: string | null;
    rotatedAt: Date | null;
}

/** Аккаунт сессии в объёме, нужном гварду. */
export interface SessionAccount {
    id: string;
    email: string;
    isActive: boolean;
    emailConfirmed: boolean;
    blocked: boolean;
}

/** Откуда вход: устройство, браузер, адрес. */
export interface SessionClient {
    deviceId: string;
    userAgent?: string;
    ipAddress?: string;
}

export const isSessionUsable = (session: AuthSession, now: Date): boolean =>
    session.revokedAt === null && session.expiresAt > now;
