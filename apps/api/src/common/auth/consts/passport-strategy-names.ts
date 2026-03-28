/**
 * Имена Passport-стратегий JWT (cookie / Bearer).
 * Должны совпадать в Strategy, AuthGuard и PassportModule.register.
 */
export const PASSPORT_JWT_STRATEGY = {
    EMPLOYEE_COOKIE: "employee-jwt-cookie",
    EMPLOYEE_BEARER: "employee-jwt-bearer",
    MEMBER_COOKIE: "member-jwt-cookie",
    MEMBER_BEARER: "member-jwt-bearer",
} as const;
