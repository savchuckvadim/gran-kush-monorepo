import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt";

import { AUTH_GLOBAL_SCOPE, PASSPORT_JWT_STRATEGY } from "@common/auth";
import { ConfigCookieService } from "@common/cookie/services/config-cookie.service";
import {
    JWT_ENV_KEYS,
    JWT_ERROR_MESSAGES,
} from "@modules/portal/auth/domain/constants/jwt.constants";
import { AuthJwtPayload } from "@modules/portal/auth/domain/interfaces/jwt-payload.interface";
import { EmployeeAuthService } from "@modules/portal/auth/employees/application/services/employee-auth.service";
import { AuthenticatedUser } from "@modules/portal/auth/shared/domain/auth-user";

/**
 * CRM веб: только HttpOnly cookie (без Bearer).
 * Токен глобальный (без portalId); employment резолвит MembershipGuard.
 *
 * Access token revocation: tokens are short-lived JWTs (15 min TTL) — not stored in DB.
 * Per-request DB lookup is intentionally skipped for performance. Revocation is handled
 * by revoking the refresh token on logout (stored in DB with `revoked: false` check).
 * Maximum exposure window on logout = 15 minutes.
 */
@Injectable()
export class EmployeeJwtCookieStrategy extends PassportStrategy(
    Strategy,
    PASSPORT_JWT_STRATEGY.EMPLOYEE_COOKIE
) {
    constructor(
        private readonly employeeAuthService: EmployeeAuthService,
        configService: ConfigService,
        configCookieService: ConfigCookieService
    ) {
        const secretOrKey = configService.get<string>(JWT_ENV_KEYS.SECRET);
        if (!secretOrKey) {
            throw new Error(JWT_ERROR_MESSAGES.SECRET_NOT_CONFIGURED);
        }
        /* passport-jwt: ExtractJwt typings */
        /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: { cookies?: Record<string, unknown> }) => {
                    const accessName = configCookieService.getCookieNames(
                        AUTH_GLOBAL_SCOPE.CRM
                    ).access;
                    const token = request?.cookies?.[accessName];
                    return typeof token === "string" ? token : null;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey,
            passReqToCallback: false,
        });
        /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    }

    async validate(payload: AuthJwtPayload): Promise<AuthenticatedUser> {
        const user = await this.employeeAuthService.validateJwtPayload(payload);

        if (!user) {
            throw new UnauthorizedException("User not found or inactive");
        }

        return user;
    }
}
